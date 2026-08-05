---
title: Roteiro de Testes para Go-Live em Producao
type: plan
status: review
confidence: 0.70
owner: engenharia
related:
  - ../../GO-LIVE-CHECKLIST.md
  - ../processes/autenticacao-e-autorizacao.md
  - ../processes/agendamento-consulta.md
  - ../processes/pagamentos-consulta.md
  - ../processes/notificacoes-e-preferencias.md
  - ../systems/api-backend-e-contratos.md
  - ../systems/pwa-build-e-deploy.md
tags: [testes, qa, go-live, checklist, producao]
last_updated: 2026-07-21
---

<!-- ai-summary
System: roteiro de testes manuais feitos direto no frontend/navegador para validar o app antes de liberar producao.
Flow: abrir o site -> preparar contas/dados de teste -> testar cada fluxo clicando na tela por papel -> checar seguranca/PWA -> decidir GO/NO-GO.
Owner: engenharia.
Systems: src/pages/*, GO-LIVE-CHECKLIST.md.
Status: review.
-->

# Roteiro de Testes para Go-Live em Producao

Este documento e o **passo a passo executavel de testes feitos no proprio
frontend** (navegador/app), como um usuario real faria — sem precisar de
terminal ou comandos. Ele complementa o [GO-LIVE-CHECKLIST.md](../../GO-LIVE-CHECKLIST.md)
(que define os criterios de bloqueio de negocio) com o **roteiro pratico**: em
qual tela clicar, com quais dados e qual o resultado esperado de cada teste.

Use os checkboxes para marcar o progresso. Marque `[FALHOU]` ao lado do item e
descreva o erro sempre que um passo nao passar.

> Existe também um apêndice técnico opcional ao final ([Apêndice A](#apêndice-a--testes-técnicos-automatizados-opcional)) com comandos de terminal para quem tiver acesso ao código-fonte. Ele não é necessário para executar este roteiro.

## Como usar este documento

1. Abra o site/app no navegador (ambiente de staging ou produção, conforme combinado com o time técnico) e faça login com uma conta de teste.
2. Prepare os dados de teste (Fase 1) antes de começar a clicar nas telas.
3. Execute as Fases 2 a 8 na ordem, pois cada uma depende de dados criados na anterior (usuário → agendamento → pagamento → notificação).
4. Ao final, preencha a seção "Decisão Go/No-Go".

---

## Fase 1 — Preparação para começar a testar

- [ ] Confirmar com o time técnico qual URL usar no teste (staging ou produção) e abrir essa URL no navegador.
- [ ] Confirmar visualmente que o app **não** está em modo de demonstração/mock (nenhum aviso de "dados fictícios" na tela; os dados exibidos devem ser reais).
- [ ] Ter à mão pelo menos:
  - [ ] 1 conta paciente de teste (ou cadastrar uma nova pela própria tela de Signup).
  - [ ] 1 conta médico aprovado com valor de consulta configurado.
  - [ ] 1 conta admin.
  - [ ] Um método de pagamento real de teste (PIX de banco real ou cartão de teste).
- [ ] Limpar o histórico/cookies do navegador antes de iniciar, ou usar uma aba anônima, para começar com sessão limpa.
- [ ] Ter o navegador em uma janela onde dê para ver mensagens de erro na tela (sem precisar abrir ferramentas de desenvolvedor).

---

## Fase 2 — Autenticação e sessão

Referência: [Processo de Autenticação e Autorização](../processes/autenticacao-e-autorizacao.md)

### 2.1 Cadastro (Signup)
- [ ] Criar novo paciente em `/signup` com dados válidos → sucesso e redirecionamento esperado.
- [ ] Tentar cadastro com e-mail já existente → mensagem de erro clara (não genérica).
- [ ] Tentar cadastro com senha fraca/campos obrigatórios vazios → validação client-side bloqueia envio.
- [ ] Verificar aceite dos termos/LGPD (`LegalConsent`) é obrigatório antes de enviar.

### 2.2 Confirmação de e-mail
- [ ] Fluxo de `/confirmar-email` com token válido confirma a conta.
- [ ] Token inválido/expirado exibe erro tratado (sem tela em branco).

### 2.3 Login
- [ ] Login paciente com e-mail/senha correta → redireciona para `/dashboard`.
- [ ] Login médico com CPF/senha correta → redireciona para `/doctor`.
- [ ] Login admin → redireciona para `/admin`.
- [ ] Login com senha incorreta → mensagem de erro (não trava a tela).
- [ ] "Esqueci minha senha" (`/esqueci-senha`) envia o fluxo de recuperação.
- [ ] Reset de senha (`/resetar-senha`) com token válido troca a senha e permite novo login.

### 2.4 Sessão e proteção de rotas
- [ ] Acessar rota protegida (`/dashboard`, `/doctor`, `/admin`) sem login → redireciona para `/login`.
- [ ] Paciente tentando acessar `/admin` ou `/doctor` → redireciona para a home do próprio papel (não expõe tela).
- [ ] Deixar o token expirar (ou forçar 401) → interceptor tenta refresh; se falhar, limpa sessão e volta ao login.
- [ ] Logout limpa sessão local e bloqueia acesso a rotas protegidas até novo login.

---

## Fase 3 — Agendamento de consulta (paciente)

Referência: [Processo de Agendamento de Consulta](../processes/agendamento-consulta.md)

> **ATENÇÃO (2026-08-05):** o backend passou a exigir que a consulta esteja **CONCLUIDA** antes de
> permitir a criação do pagamento (modelo pós-atendimento, ver [Processo de Pagamento](../processes/pagamentos-consulta.md)).
> Confirmar um agendamento **não** leva mais direto para `/payment` — o botão "Pagar consulta"
> só aparece no Dashboard depois que a consulta é marcada como concluída pelo backend.

- [ ] Lista de médicos em `/book` carrega médicos **aprovados** com nome, especialidade e valor da consulta (ou "A combinar" quando ausente).
- [ ] Selecionar médico + data exibe horários disponíveis (via API) ou fallback local de slots (06:00–00:00, 30 em 30 min) quando a API não retorna.
- [ ] Horários já passados no dia atual **não** ficam selecionáveis.
- [ ] Selecionar um horário e confirmar cria a consulta e **redireciona para `/dashboard`** (não mais para `/payment`), exibindo a consulta com status "Pendente".
- [ ] Forçar conflito de horário (agendar o mesmo slot duas vezes) → erro 409 tratado, slots recarregados, sem deixar reenviar o mesmo horário.
- [ ] Cancelar um agendamento (se aplicável na tela do paciente) reflete no dashboard.

---

## Fase 4 — Pagamento (fluxo de receita — crítico)

Referência: [Processo de Pagamento da Consulta](../processes/pagamentos-consulta.md)

> **ATENÇÃO (2026-08-05):** pagamento agora só é permitido **depois** que a consulta é marcada
> como CONCLUIDA pelo backend (~10 min após o horário marcado, ou quando o médico finaliza
> manualmente). Para testar esta fase é preciso: agendar uma consulta com o médico de teste
> (Dra. Ana Costa, R$ 0,10) em um horário já passado (ou aguardar o horário passar), confirmar
> que ela aparece como CONCLUIDA no Dashboard com o botão "Pagar consulta", e só então seguir
> os passos abaixo.

### 4.0 Pré-condição: aguardar/forçar conclusão
- [ ] Após o horário marcado passar (~10 min), o Dashboard do paciente exibe o botão "Pagar consulta" para a consulta.
- [ ] Abrir `/payment` **antes** da consulta estar concluída (via URL direta) exibe mensagem clara de bloqueio, sem travar a tela ou expor erro técnico.

### 4.1 PIX
- [ ] Gerar PIX em `/payment` chama `POST /v1/pagamentos/pix` e exibe QR code + copia-e-cola (`qrCode`/`qrCodeBase64`/`ticketUrl`) e validade.
- [ ] Clicar rapidamente duas vezes em "Gerar código PIX" **não** gera cobrança duplicada (idempotência).
- [ ] Pagar o PIX de verdade (valor simbólico controlado) em um app bancário real.
- [ ] Polling detecta `pagamento.status === "PAGO"` em até ~5s de intervalo e redireciona para `/dashboard`.
- [ ] QR expirado (validade vencida) exibe mensagem/ação de gerar novo código, sem travar a tela.

### 4.2 Cartão (gateway Asaas)
- [ ] Confirmar que `VITE_ASAAS_TOKENIZATION_KEY` está configurada no ambiente testado — sem ela, o
  checkout de cartão fica bloqueado com mensagem tratada ("chave de tokenização do Asaas não configurada").
- [ ] Tokenizar um cartão novo (`CreditCardForm`) e confirmar pagamento aprovado/recusado com mensagem clara.
- [ ] Pagar com um cartão salvo (se houver) e confirmar o mesmo resultado.
- [ ] Cartão recusado exibe o motivo (`cartao.statusDetail`) e oferece pagar com Pix.

### 4.3 Pós-pagamento
- [ ] Consulta paga aparece no dashboard do paciente com status correto.
- [ ] Consulta paga aparece no dashboard do médico correspondente.
- [ ] Nenhuma tela mostra dado mockado (`VITE_MOCK` deve estar `false` neste teste).

---

## Fase 5 — Área do médico

- [ ] `/doctor` (DoctorDashboard) lista as consultas do médico logado com status corretos.
- [ ] `/doctor/schedule` (DoctorSchedule) permite configurar disponibilidade/agenda.
- [ ] `/crm-validation` — upload de PDF da carteira do CRM envia e exibe status retornado pelo backend (aprovado/pendente/rejeitado).
- [ ] Perfil do médico (`/profile`) permite configurar "Valor da consulta (R$)" e o valor reflete em `/book` para pacientes.
- [ ] `/earnings` exibe repasses/ganhos do médico.
- [x] `/repasse/:id` (RepasseDetail) exibe detalhe de um repasse específico sem cair em fallback mock silencioso — erro real da API deve aparecer se houver falha. (2026-07-22: corrigido bug em que Earnings.tsx navegava com o id do repasse individual em vez do id do ciclo de repasse, causando erro 404 real ao abrir o detalhe — ver `divergencias.md`.)
- [ ] `/bank-details` permite cadastrar/editar dados bancários para repasse.
- [x] Definir o processo de repasse (manual ou automático) conforme decisão de negócio — decidido em 2026-07-23: repasse automático semanal, com opção de repasse imediato mediante taxa retida pela plataforma. Ver [ADR 0002](../decisions/adr-0002-estrategia-repasse-medico.md).
- [ ] Validar em produção o fluxo de solicitação de repasse imediato (depende de confirmação do contrato do endpoint pelo backend).

---

## Fase 6 — Notificações e preferências

Referência: [Processo de Notificações e Preferências](../processes/notificacoes-e-preferencias.md)

- [ ] `/notifications` carrega preferências existentes (canais push/e-mail/WhatsApp e eventos).
- [ ] Salvar preferências com endpoint disponível → confirma sucesso.
- [ ] Forçar indisponibilidade do endpoint (ou testar em ambiente sem suporte) → fallback local salva sem travar a UX (sem `alert` bloqueante).
- [ ] Teste de notificação WhatsApp com número real → validar que ao menos um dos endpoints alternativos responde com sucesso ou erro tratado (não 401 silencioso).
- [ ] Push web: validar registro do service worker (`sw.js`) sem conflito com o service worker gerado pelo plugin PWA (ver risco documentado em [pwa-build-e-deploy.md](../systems/pwa-build-e-deploy.md)).

---

## Fase 7 — Admin

- [ ] `/admin` carrega com dados reais (não mock) e permite visualizar/gerenciar médicos, pacientes e/ou consultas conforme escopo atual.
- [ ] Aprovar/reprovar médico (se disponível) reflete imediatamente na listagem de `/book` para pacientes.
- [ ] Ações administrativas críticas exigem sessão de admin válida (testar acesso direto por URL sem papel ADMIN → bloqueado).

---

## Fase 8 — Páginas públicas, legal e PWA

- [ ] `/` (LandingPage) carrega rápido e sem erros de console.
- [ ] `/termos-e-condicoes`, `/termos-de-uso`, `/politica-de-privacidade`, `/lgpd` acessíveis e com conteúdo atualizado/coerente com a operação real.
- [ ] Rota inexistente cai em `NotFound` (404) sem quebrar a aplicação.
- [ ] Testar instalação do PWA (Add to Home Screen) em Android/desktop Chrome.
- [ ] Testar app funcionando após reload em rota profunda (ex.: `/dashboard` direto na URL) — nginx/host deve fazer fallback SPA para `/index.html`.
- [ ] Verificar manifest e ícones do PWA carregando corretamente (sem 404 em `manifest.json`/ícones).
- [ ] Testar cache do service worker: alterar versão do app e confirmar que o usuário recebe a atualização (sem ficar preso em versão antiga).

---

## Fase 9 — Segurança e OWASP (checklist rápido)

- [ ] HTTPS obrigatório em produção — verificar no navegador o cadeado/URL com `https://` no site e nas chamadas de API (aba Network do DevTools).
- [ ] Nenhum aviso de "conteúdo não seguro"/mixed content aparece na barra do navegador.
- [ ] Tokens de sessão não aparecem no console do navegador em produção (abrir DevTools > Console e navegar pelo app; não deve haver logs de token/senha).
- [ ] Mensagens de erro exibidas na tela não expõem token/refreshToken (testar forçando um erro, ex.: sessão expirada).
- [ ] Rotas protegidas realmente bloqueiam acesso direto por URL para papéis não autorizados (testar digitando `/admin` ou `/doctor` logado como paciente).
- [ ] Upload de arquivo (ex.: CRM em PDF) recusa arquivo de tipo/tamanho inválido com mensagem clara.
- [ ] *(confirmar com o time técnico, fora do navegador)* Nenhuma chave secreta exposta no bundle público e CORS do backend restrito ao domínio oficial.
- [ ] *(confirmar com o time técnico, fora do navegador)* Dependências sem vulnerabilidades críticas conhecidas (`npm audit` revisado antes do go-live).

---

## Fase 10 — Performance e observabilidade

- [ ] Navegação entre telas é rápida, sem travamentos perceptíveis em conexão 4G/Wi-Fi comum.
- [ ] Rodar o site pelo Lighthouse do próprio navegador (Chrome DevTools > Lighthouse, modo mobile) e conferir que não há erros críticos de performance/acessibilidade/PWA.
- [ ] *(confirmar com o time técnico)* Erros de frontend em produção têm algum canal de observação (log/monitoramento) para a janela de observação pós-go-live.
- [ ] *(confirmar com o time técnico)* Plano de rollback definido (versão anterior de imagem Docker/tag) caso o go-live apresente falha crítica.

---

## Decisão Go/No-Go

Preencher após executar todas as fases aplicáveis ao escopo do release.

- [ ] Fase 1 — Preparação: OK
- [ ] Fase 2 — Autenticação: OK
- [ ] Fase 3 — Agendamento: OK
- [ ] Fase 4 — Pagamento: OK
- [ ] Fase 5 — Área do médico: OK
- [ ] Fase 6 — Notificações: OK
- [ ] Fase 7 — Admin: OK
- [ ] Fase 8 — Público/PWA: OK
- [ ] Fase 9 — Segurança: OK
- [ ] Fase 10 — Performance/observabilidade: OK

Critério: qualquer falha nas Fases 2, 3 ou 4 (autenticação, agendamento ou pagamento) é **NO-GO** automático, alinhado com a seção "Itens que BLOQUEIAM lançamento" do [GO-LIVE-CHECKLIST.md](../../GO-LIVE-CHECKLIST.md).

- GO: [ ] Sim
- NO-GO: [ ] Não
- Data/hora da execução do roteiro: __________________
- Responsável pela execução: __________________
- Ambiente testado (staging/produção): __________________

---

## Apêndice A — Testes técnicos automatizados (opcional)

> Esta seção é **opcional** e só se aplica a quem tem acesso ao código-fonte e
> ao terminal (time técnico). Ela não é necessária para executar o roteiro
> manual das Fases 1 a 10 acima, que é feito inteiramente pelo navegador/app.

Objetivo: garantir que a suíte de testes automatizados existente passa, como uma checagem complementar (não substitui os testes manuais na tela).

```powershell
npm run typecheck
npm run test
npm run build
```

- [ ] `npm run typecheck` sem erros de TypeScript.
- [ ] `npm run test` — todos os arquivos de teste passam.
- [ ] `npm run build` conclui sem erros (gera `dist/`).

### Matriz resumida de cobertura automatizada existente

| Área | Arquivo de teste | Cobertura |
|---|---|---|
| Status de consulta | `src/constants/consultaStatus.test.ts` | Regras de status/labels |
| Data/hora | `src/utils/datetime.test.ts` | Parsing e formatação de datas |
| Pagamento | `src/pages/Payment.test.tsx` | Idempotência do checkout PIX |
| Dashboard paciente | `src/pages/Dashboard.test.tsx` | Botão "Entrar na consulta" e estados |
| Validação CRM | `src/pages/CrmValidation.test.tsx` | Upload de PDF e status retornado |
| Agendamento | `src/pages/BookAppointment.test.tsx` | Conflito de horário (409) |

**Gaps conhecidos (sem teste automatizado hoje):** login (e-mail/senha, CPF/senha), signup, reset de senha, fluxo completo de cartão (success/pending/failure), notificações/preferências, admin, earnings/repasse, bank details, PWA/service worker. Por isso o roteiro manual nas Fases 2 a 8 é a forma principal de validar esses fluxos antes do go-live.
