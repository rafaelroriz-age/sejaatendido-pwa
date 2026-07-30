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
