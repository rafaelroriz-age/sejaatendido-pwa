# Go-live Checklist — SejaAtendido PWA

Data: 2026-06-08
Objetivo: liberar produção com segurança para iniciar faturamento.

> Para o passo a passo executável de testes (automatizados e manuais, por fluxo/papel),
> veja [docs/plans/roteiro-testes-producao.md](docs/plans/roteiro-testes-producao.md).

## 1) Itens que BLOQUEIAM lançamento

- [x] Produção sem mock
  - Confirmado em 2026-07-25 via validação real em produção (Playwright + conta paciente/Dr. Carlos teste).

- [x] Backend de produção configurado em HTTPS
  - Confirmado em 2026-07-25: chamadas de API em `sejaatendido.com.br` validadas sobre HTTPS.

- [ ] Fluxo de receita validado ponta a ponta em produção
  - Confirmado em 2026-07-25 (login -> listar médico aprovado -> agendar -> gerar PIX -> concluir pagamento -> status correto), **porém a validação foi feita com o gateway Mercado Pago**. Gateway trocado para **Asaas** em 2026-07-30 — revalidação completa pendente (ver seção 8).
  - **Reaberto novamente em 2026-08-05**: o backend passou a exigir consulta `CONCLUIDA` antes de permitir criar o pagamento (modelo pós-atendimento, ver seção 9). O fluxo pré-pagamento validado em 2026-07-25 não existe mais — precisa de nova validação ponta a ponta com o fluxo atual.

- [ ] PIX aderente ao contrato atual
  - Confirmado em 2026-07-25 para o contrato Mercado Pago. Contrato do Asaas ainda não confirmado/documentado — pendente.

- [ ] Polling de pagamento confirmando status final correto
  - Confirmado em 2026-07-25 (Mercado Pago). Precisa ser reconfirmado com as respostas reais do Asaas (`syncPagamento`).

- [x] Médicos aprovados visíveis para agendamento
  - Confirmado em 2026-07-25 na validação real de produção.

- [x] Estratégia de repasse para médico definida
  - Decisão (2026-07-23): repasse **automático** (ciclo semanal, sem ação manual do médico). O médico pode opcionalmente solicitar **repasse imediato**, mediante **taxa retida pela plataforma** (fica para a conta do aplicativo), descontada do valor antecipado. Ver [ADR 0002](docs/decisions/adr-0002-estrategia-repasse-medico.md) e [Processo de Pagamento da Consulta](docs/processes/pagamentos-consulta.md).
  - Contrato do endpoint de repasse imediato confirmado com o backend em 2026-07-25.
  - Risco: gargalo financeiro/operacional pós-venda (mitigado pela decisão acima).

## 2) Itens que NÃO bloqueiam lançamento (mas devem entrar no backlog)

- [ ] Redução de alertas (`window.alert`) para UX mais fluida.
- [ ] Otimização de bundle/chunks do Vite.
- [ ] Refino visual e microinterações.
- [ ] Testes automatizados completos (recomendado, porém não obrigatório para go-live inicial).

## 3) O que EU consigo fazer por você (no código)

- [x] Corrigir endpoints e contratos frontend/backend.
- [x] Ajustar parsing/normalização de payload para tolerar variações do backend.
- [x] Implementar tratamento de erros e mensagens reais da API.
- [x] Corrigir fluxo de pagamento (PIX/cartão + polling + fallback).
- [x] Corrigir fluxo de agendamento até encaminhar para pagamento.
- [x] Adicionar telemetria temporária DEV para diagnóstico.
- [x] Rodar build, corrigir erros TS e publicar via commit/push.
- [x] Sincronização automática de status no retorno de checkout (PaymentSuccess/Pending/Failure).
- [x] Remover fallback mock silencioso em RepasseDetail — erros reais agora visíveis.
- [x] Login com Google removido do LoginScreen (decisão de negócio: fluxo retirado).
- [x] Push web-pwa: fallback graceful sem alert — não bloqueia save de preferências.
- [x] window.alert removido dos fluxos críticos (Signup, ResetPassword, ForgotPassword, BankDetails, Profile, Payment, NotificationPreferences).
- [x] Redesign visual da tela de Pagamento com branding consistente.
- [x] Code splitting via lazy import — bundle principal reduzido de 549KB para 260KB (-53%).

## 4) O que VOCÊ precisa fazer (fora do código)

- [x] Confirmar variáveis de ambiente de produção (Actions/host):
  - `VITE_API_URL`
  - ~~`VITE_MP_PUBLIC_KEY`~~ (removida em 2026-07-30 — não é mais usada após a migração para Asaas, ver seção 8)
  - `VITE_MOCK=false`

- [ ] **Novo (2026-08-05)**: cadastrar os secrets do GitHub Actions para o checkout de cartão
  funcionar em produção e homologação (wiring já adicionado ao `Dockerfile`/workflows nesta
  rodada, mas os secrets em si precisam ser criados por quem tem acesso à conta Asaas):
  - `VITE_ASAAS_TOKENIZATION_KEY` (chave restrita de tokenização, produção) — usada por `deploy.yml`.
  - `VITE_ASAAS_TOKENIZATION_KEY_SANDBOX` (chave restrita de tokenização, sandbox) — usada por `deploy-homolog.yml`.
  - Sem esses secrets, o checkout de cartão novo continua bloqueado com mensagem tratada
    ("chave de tokenização do Asaas não configurada"), mas o PIX não é afetado.

- [x] Executar teste real de pagamento (transação controlada) com conta paciente real. Validado em 2026-07-25.
- [x] Validar operação do lado médico após compra (consulta aparece, status correto, agenda consistente). Validado em 2026-07-25 com o Dr. Carlos teste.
- [x] Definir processo financeiro de repasse (manual/automático) e operação de suporte — decidido: automático, com opção de repasse imediato mediante taxa (ver ADR 0002).
- [x] Confirmar com o backend o contrato definitivo do endpoint de repasse imediato (rota e percentual/valor de taxa). Confirmado em 2026-07-25.
- [x] Conferir políticas legais/publicação (termos, privacidade, contato, suporte). Todos os campos de `src/config/legal.ts` preenchidos em 2026-07-24 (razão social, CNPJ, endereço, DPO, foro, data de vigência, canal do titular).

## 5) Go / No-Go (decisão rápida)

Marque GO apenas se todos os itens da seção "BLOQUEIAM lançamento" estiverem concluídos.

- GO: [ ] Sim
- NO-GO: [x] Não (reaberto em 2026-07-30 — troca de gateway de pagamento para Asaas invalida a validação de 2026-07-25, feita com Mercado Pago)
- Data/hora da decisão: 2026-07-25 (GO original) — revogado em 2026-07-30
- Responsável: __________________

## 6) Plano de validação mínima (30-60 min)

1. Login paciente (email/senha).
2. Abrir agendamento e confirmar médico aprovado visível.
3. Criar consulta em slot válido.
4. Gerar PIX e validar QR + copia-e-cola.
5. Confirmar mudança de status para pago.
6. Validar dashboard paciente e dashboard médico.
7. Validar cancelamento e mensagens de erro de API.

## 7) Observações

- Se houver qualquer falha em autenticação, listagem de médicos ou pagamento, classificar como NO-GO.
- Após GO, monitorar primeiras transações em janela de observação (ex.: primeiras 24h).

## 8) Migração de gateway: Mercado Pago -> Asaas (2026-07-30)

- [x] Backend passou a usar Asaas como provedor de pagamento (PIX/cartão) no lugar do Mercado Pago.
- [x] Frontend desacoplado do contrato Mercado Pago (2026-07-30):
  - Removida a dependência `@mercadopago/sdk-react` (`package.json`, `src/main.tsx`, `src/vite-env.d.ts`) e as variáveis `VITE_MP_PUBLIC_KEY` do Dockerfile/CI/docker-compose.
  - `src/services/api.ts`: `PagamentoResponse`/`normalizePagamentoResponse` passam a expor um objeto `asaas` (`paymentId`, `invoiceUrl`, `checkoutUrl`, `billingType`) e continuam alimentando os campos genéricos `linkPagamento`/`paymentUrl` usados pela UI.
  - `src/pages/Payment.tsx`: o checkout de cartão agora usa `data.linkPagamento`/`data.paymentUrl` (com fallback para `data.asaas.invoiceUrl`/`checkoutUrl`) em vez de campos específicos do Mercado Pago; textos de UI que citavam "Mercado Pago" foram generalizados.
  - `src/mocks/handlers.ts` e `src/pages/Payment.test.tsx` atualizados para o novo contrato (inclui novos testes de checkout de cartão via Asaas).
  - `npm run typecheck`, `npm test -- --run` e `npm run build` executados com sucesso após a migração.
- [ ] **Pendente de validação real**: confirmar contra o backend/staging que os nomes de campo assumidos (`asaas.invoiceUrl`/`checkoutUrl`, contrato de PIX inalterado) batem com a resposta real do Asaas. Se divergirem, ajustar apenas `normalizePagamentoResponse` em `services/api.ts`.
- [ ] Reexecutar o roteiro da Fase 4 de [roteiro-testes-producao.md](docs/plans/roteiro-testes-producao.md) (PIX + cartão) em staging/produção real antes de reabrir o GO.
- [x] Passo de validação de código/testes do fluxo Asaas (pagamento + repasse) executado em 2026-07-30 — ver [docs/plans/2026-07-30-passo-validacao-asaas-frontend.md](docs/plans/2026-07-30-passo-validacao-asaas-frontend.md). Corrigido nesta rodada: tratamento de erros 422 (CPF ausente), 409 (consulta já paga), 403 (acesso negado) e retenção antifraude no repasse imediato; UI de "cartão salvo" desativada (Asaas não suporta). Execução ponta a ponta contra o Asaas sandbox real segue pendente.

## 9) Mudança de modelo: pagamento pós-atendimento (2026-08-05)

- [x] Backend passou a exigir `consulta.status === 'CONCLUIDA'` para permitir a criação de
  pagamento (antes era possível pagar logo após o agendamento). O frontend já reflete essa regra:
  - `src/pages/BookAppointment.tsx` não redireciona mais para `/payment` após confirmar o
    agendamento — vai para `/dashboard`.
  - `src/pages/Dashboard.tsx` só exibe o botão "Pagar consulta" quando a consulta está `CONCLUIDA`.
  - `src/pages/Payment.tsx` trata separadamente os erros 400/403 "consulta não concluída", 422
    (CPF ausente), 409 (já paga) e 403 (acesso negado a outro paciente), com mensagens tratadas.
  - Ver detalhes em [docs/processes/pagamentos-consulta.md](docs/processes/pagamentos-consulta.md).
- [x] Testado nesta rodada (Playwright + mocks MSW): login, agendamento, seletor de forma de
  pagamento redesenhado, bloqueio por CPF ausente, geração de PIX mock, e bloqueio correto do
  checkout de cartão quando a chave de tokenização do Asaas não está configurada. `npm test`,
  `npm run typecheck` e `npm run build` passam (75/75 testes).
- [x] Corrigido nesta rodada: `mocks/handlers.ts` agora reproduz a trava "consulta não concluída"
  nos endpoints de pagamento (antes os mocks aceitavam qualquer status, escondendo essa regra em
  testes manuais); foi adicionada uma consulta seed já `CONCLUIDA` (`consulta-pronta-pagamento`)
  para permitir testar o caminho feliz sem esperar o cron real.
- [x] Corrigido nesta rodada: **`VITE_ASAAS_TOKENIZATION_KEY`/`VITE_ASAAS_ENV` não eram
  propagadas em nenhum pipeline de build** (`Dockerfile`, `docker-compose.yml`,
  `docker-compose.staging.yml`, `.github/workflows/deploy.yml`,
  `.github/workflows/deploy-homolog.yml`) — o checkout de cartão novo estava quebrado em
  qualquer ambiente publicado (produção, homolog e sandbox Docker), não só localmente. Wiring
  adicionado em todos os arquivos; falta apenas **cadastrar os secrets reais no GitHub**
  (`VITE_ASAAS_TOKENIZATION_KEY` para produção, `VITE_ASAAS_TOKENIZATION_KEY_SANDBOX` para
  homologação) — ver seção 4.
- [ ] **Pendente de validação real**: confirmar em staging/produção que o cron que marca a
  consulta como `CONCLUIDA` está ativo e que o fluxo completo (agendar → aguardar conclusão →
  pagar) funciona ponta a ponta com o backend real. Reexecutar Fase 3/4 de
  [roteiro-testes-producao.md](docs/plans/roteiro-testes-producao.md) (já atualizado para o novo fluxo).
