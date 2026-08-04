---
title: Processo de Agendamento de Consulta
type: process
status: review
confidence: 0.80
owner: frontend
related:
  - ../systems/api-backend-e-contratos.md
  - pagamentos-consulta.md
  - ../knowledge/dominio-e-papeis.md
  - ../plans/divergencias.md
tags: [agendamento, consulta, disponibilidade]
last_updated: 2026-07-30
---

<!-- ai-summary
System: paciente agenda consulta escolhendo medico, data e slot disponivel.
Flow: listar medicos -> selecionar data -> carregar slots -> validar horario futuro -> criar consulta -> ir para dashboard (pagamento so libera apos consulta CONCLUIDA via cron).
Owner: frontend.
Systems: src/pages/BookAppointment.tsx, src/pages/Dashboard.tsx, src/services/api.ts.
Status: review.
-->

# Processo de Agendamento de Consulta

## Origem e evidencias

- Evidencia principal: src/pages/BookAppointment.tsx
- Evidencia principal: src/pages/Dashboard.tsx
- Evidencia principal: src/services/api.ts

## Fluxo atual

1. Carrega medicos via fetchMedicos().
2. Usuario escolhe medico e data.
3. Frontend consulta disponibilidade via fetchDisponibilidadeMedico(medicoIds, data).
4. Se API nao retornar slots, usa fallback local de 06:00 a 00:00 em intervalos de 30 minutos.
5. Frontend bloqueia horarios passados comparando slot selecionado com Date.now().
6. Ao confirmar, chama createConsulta com medicoId candidato + dataHora. A consulta e criada com status PENDENTE.
7. Em sucesso, redireciona para /dashboard (nao para /payment) com state `{ bookingConfirmed: true }`.

## Fluxo pos-agendamento ate o pagamento (atualizado)

O agendamento **nao** redireciona direto para a tela de pagamento. O motivo e uma regra de negocio do backend: um pagamento so pode ser criado quando a consulta esta com status `CONCLUIDA`, o que so ocorre minutos apos o horario marcado (via cron de auto-conclusao no backend, com atraso esperado de alguns minutos). Ver `src/pages/Dashboard.tsx` (`canPayConsulta`, `isAwaitingConclusion`).

1. Apos agendar, o paciente cai no Dashboard com uma mensagem informando que o pagamento sera liberado automaticamente apos a consulta ser concluida.
2. O medico precisa aceitar a consulta (acao `ACEITAR` via `PATCH /medicos/me/consultas/:id`) antes ou depois do horario marcado — a aceitacao muda o status para `ACEITA` e, no backend, deveria gerar o `meetLink` (sala de videochamada) neste momento.
3. O Dashboard do paciente faz polling silencioso a cada 30s (`CONSULTAS_POLL_INTERVAL_MS`) para detectar tanto a transicao `PENDENTE -> ACEITA` (meetLink passa a existir) quanto a conclusao automatica da consulta.
4. Quando o backend marca a consulta como `CONCLUIDA` (cron, ~10min apos o horario), o botao "Pagar consulta" aparece no Dashboard e o fluxo de pagamento (`/payment`) e liberado.
5. O pagamento em si (Pix/cartao via Mercado Pago) e tratado em `pagamentos-consulta.md`.

> Ver `../decisions/adr-0001-fallback-endpoints-notificacao.md` e `pagamentos-consulta.md` para detalhes da integracao de pagamento.

## Bug conhecido (2026-07): meetLink nao gerado ao aceitar

Foi observado que `PATCH /medicos/me/consultas/:id` com `acao: "ACEITAR"` responde `200` mas **nao persiste** a mudanca de status no backend (a consulta volta a aparecer como `PENDENTE` num refetch). Como consequencia, o `meetLink` — que so e gerado pelo backend no momento em que a consulta passa a `ACEITA` — nunca chega a existir, mesmo para consultas que depois sao concluidas (`CONCLUIDA`) e pagas pelo cron. Isso impede paciente e medico de "Entrar na Consulta" (video chamada), embora o pagamento funcione normalmente.

- Isso e um bug de **backend** (persistencia do PATCH + geracao do meetLink), nao do frontend: o frontend ja faz atualizacao otimista + refetch (`handleUpdateConsulta` em `src/pages/DoctorDashboard.tsx`) e ja trata `meetLink` ausente sem quebrar a UI (oculta o botao de entrar / usa fallback para o chat).
- Ver `../plans/duvidas-abertas.md` e `../plans/pendencias-somente-usuario-passo-a-passo.md` para acompanhamento.

## Bug critico confirmado em producao (2026-07-30): aceite de consulta quebrado por contrato divergente — corrigido no frontend em 2026-07-30

Teste end-to-end em `https://sejaatendido.com.br` (paciente novo + medico `Dr. Carlos Teste`, CPF de teste) reproduziu uma falha mais grave que a acima: o clique em "Confirmar" no `DoctorDashboard` retornava **`400 Bad Request`**, e a consulta nem chegava a ficar com status inconsistente — ela simplesmente nunca mudava.

- Requisicao enviada pelo frontend (`updateConsultaMedico` em `src/services/api.ts`): `PATCH /medicos/me/consultas/:id` com corpo `{ "acao": "ACEITAR" }`.
- Resposta do backend: `400` com `{"erro":"Dados invalidos","detalhes":[{"campo":"status","mensagem":"Invalid option: expected one of \"PENDENTE\"|\"ACEITA\"|\"RECUSADA\"|\"CONCLUIDA\"|\"CANCELADA\""}]}`.
- Ou seja, o backend migrou o contrato do endpoint de `{ acao: "ACEITAR"|"RECUSAR"|"FINALIZAR" }` para `{ status: "ACEITA"|"RECUSADA"|"CONCLUIDA" }` (enum de destino direto), mas o frontend (`acaoMap` em `updateConsultaMedico`) ainda enviava o campo antigo `acao`.
- **Impacto (ate a correcao):** nenhum medico conseguia aceitar, recusar ou concluir manualmente uma consulta pela UI. O fluxo completo travava permanentemente em `PENDENTE` a menos que o cron de auto-conclusao do backend eventualmente alterasse o status por outro caminho.
- **Causa raiz:** dessincronia de contrato front/back (nao e o mesmo bug do item anterior, que era de persistencia; este era de validacao/schema do payload).
- **Correcao aplicada (frontend, 2026-07-30):** `updateConsultaMedico` agora envia `{ status: acao, ...(motivoRecusa ? { motivoRecusa } : {}) }` em vez de `{ acao: acaoMap[acao] }`, alinhado ao enum confirmado pela resposta 400. Coberto por `src/services/updateConsultaMedico.test.ts` (regressao) e o mock MSW (`src/mocks/handlers.ts`) foi atualizado para validar o novo contrato.
- **Pendente do lado backend:** confirmar em producao que `PATCH /medicos/me/consultas/:id` com `{ status: "ACEITA" }` (a) responde `200`, (b) persiste o novo status (nao volta a `PENDENTE` num refetch — ver bug de persistencia acima) e (c) gera o `meetLink` no mesmo momento. Confirmar tambem se `motivoRecusa` e o nome de campo esperado ao recusar, e se existe alguma validacao adicional de transicao de estado (ex.: nao permitir `CONCLUIDA` antes do horario da consulta).
- Ver divergencia registrada em `../plans/divergencias.md` (agora marcada como resolvida no frontend).

## O que o backend precisa fazer para acompanhar (resumo acionavel)

1. **Confirmar e estabilizar o contrato `{ status }`** do `PATCH /medicos/me/consultas/:id` (ja corrigido no frontend) — publicar/validar o schema oficial (enum de `status`, campo `motivoRecusa`) para evitar nova dessincronia de contrato.
2. **Corrigir a persistencia do PATCH de aceite.** Hoje (bug documentado acima) o status pode nao persistir e a consulta volta a `PENDENTE` num refetch — isso e bloqueante mesmo com o contrato correto.
3. **Gerar o `meetLink` no momento em que a consulta passa a `ACEITA`.** Sem isso, paciente e medico nunca conseguem "Entrar na Consulta" mesmo com o fluxo de aceite funcionando.
4. **Incluir dados do paciente (nome) na resposta de `GET /medicos/me/consultas`.** O frontend hoje cai no fallback genérico "Paciente" (ver `getPatientName` em `src/pages/DoctorDashboard.tsx`) porque o payload não traz `paciente.nome`/`pacienteNome` de forma confiável.
5. **Expor mensagens de erro estruturadas e estáveis** (`erro`, `detalhes[].campo/mensagem`) em todos os endpoints do fluxo de agendamento — o frontend já trata esse formato (`showErrorAlert`), mas variações de shape quebram a extração da mensagem amigável.
6. **Confirmar o tempo do cron de auto-conclusão** (`PENDENTE`/`ACEITA` → `CONCLUIDA`) e, se possível, permitir configurá-lo ou expor o horário estimado de liberação do pagamento para reduzir a espera "às cegas" do paciente no Dashboard.
7. **Higienizar contas de teste em produção** (medicos "Dr(a). Medico 178XXXXXXXXX") ou expor um flag de teste filtrável, para não poluir a listagem de médicos em `/book`.

## Melhorias sugeridas para tornar o fluxo mais coeso

Alem do bug critico acima, o teste manual (Playwright/MCP) do fluxo completo — cadastro de paciente, agendamento e aceite pelo medico — revelou pontos que reduzem a coesao/consistencia percebida pelo usuario:


1. **Erros de API sao silenciosos para o usuario.** `showErrorAlert` (`src/utils/errorHandler.ts`) apenas faz `console.warn` e dispara um `CustomEvent('app:error')` que **nao tem nenhum listener** no app (busca no codigo nao encontrou nenhum `addEventListener('app:error', ...)`). Essa funcao e usada em 23 pontos (login, agendamento, chat, admin, CRM, agenda do medico, recuperacao de senha etc.). Na pratica, qualquer falha de API — como o 400 acima ao clicar em "Confirmar" — nao mostra nada na tela; o usuario so ve o botao "nao fazer nada". Sugestao: implementar um componente de toast global que escute `app:error` e exiba a mensagem (`title`/`message`) de forma visivel.
2. **Nome do paciente aparece generico no dashboard do medico.** Em `DoctorDashboard.tsx`, o card de consulta mostra o texto fixo "Paciente" no lugar do nome real (ex.: "Mariana Costa Ferreira"), mesmo com o motivo da consulta sendo exibido corretamente. Isso dificulta o medico identificar quem e o paciente antes de aceitar.
3. **Lista de selecao de medico em `/book` poluida por contas de teste.** A tela real de producao lista dezenas de "Dr(a). Medico 178XXXXXXXXX" (nomes com timestamp, claramente gerados em testes anteriores), misturados com medicos reais. Isso compromete a credibilidade da tela para um paciente real e dificulta encontrar o medico certo. Sugestao: expurgar/desativar contas de teste em producao ou adicionar filtro por status/flag de teste.
4. **Rotulo "Pendentes" ambiguo no dashboard do paciente.** O card de estatisticas em `Dashboard.tsx` usa `Pendentes` para contar consultas com **pagamento pendente** (`canPayConsulta`), mas o badge de status exibido no card de cada consulta logo abaixo usa o mesmo texto "Pendente" para indicar que a consulta **ainda aguarda confirmacao do medico**. Sao dois conceitos diferentes com o mesmo rotulo, o que confunde o paciente (ex.: consulta com badge "Pendente" mas contador "Pendentes: 0"). Sugestao: renomear o contador para algo como "Aguardando pagamento" e reservar "Pendente(s)" apenas para o status de confirmacao do medico.
5. **Sessao compartilhada entre abas sem isolamento.** Como o token fica em `localStorage` (sem particionamento por aba), logar como medico em uma aba do navegador sobrescreve silenciosamente a sessao do paciente aberta em outra aba do mesmo navegador, causando `403` nas chamadas seguintes sem qualquer aviso (reforca o ponto 1). Isso pode acontecer com um usuario real que testa duas contas na mesma janela.
6. **Falha de chunk JS apos deploy ("stale chunk").** Em um teste, apos criar a conta e fazer login, a navegacao para `/dashboard` falhou com multiplos `404` em arquivos versionados (`Dashboard-*.js`, `Badge-*.js`, `Avatar-*.js` etc.) e um erro `Failed to fetch dynamically imported module`, deixando a tela em branco; um F5 resolveu. Isso e tipico de SPA com code-splitting quando o `index.html` em cache aponta para hashes de um deploy anterior. Sugestao: adicionar um handler global de erro de import dinamico (`vite:preloadError` / `error` em `import()`) que force `window.location.reload()` automaticamente.

## Valor da consulta no frontend

- O medico configura seu valor de consulta no frontend em `src/pages/Profile.tsx` (campo "Valor da consulta (R$)").
- O salvamento do valor usa `updateMedicoPerfil({ valorConsulta })` em `src/services/api.ts`.
- A tela de agendamento (`src/pages/BookAppointment.tsx`) exibe o valor por medico no card de selecao, facilitando a comparacao pelo paciente.
- Quando o backend ainda nao retorna valor para um medico, a UI mostra "A combinar" como fallback visual.
- `Consulta.valor` (retornado por `/medicos/me/consultas` e similares) esta em **centavos**, mesma convencao usada em `Payment.tsx` e `BookAppointment.tsx` (`valor / 100`).

## Tratamento de falhas observado

- Se medicoId falhar com 404/400 especifico, tenta IDs alternativos do medico.
- Em 409 de conflito de agenda, recarrega slots e solicita novo horario.
- Busca consulta recem-criada como fallback de consistencia (findRecentlyCreatedConsulta).

## Observacao de consistencia

- Texto de marketing em src/pages/LandingPage.tsx fala em "18 slots diarios".
- Implementacao real usa quantidade dinamica da API e fallback de meia em meia hora.
- Ver divergencia registrada em ../plans/divergencias.md.
