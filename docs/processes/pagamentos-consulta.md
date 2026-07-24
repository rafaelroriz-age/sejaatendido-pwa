---
title: Processo de Pagamento da Consulta
type: process
status: review
confidence: 0.80
owner: frontend
related:
  - agendamento-consulta.md
  - ../systems/api-backend-e-contratos.md
  - ../plans/divergencias.md
  - ../decisions/adr-0002-estrategia-repasse-medico.md
tags: [pagamento, pix, cartao, mercadopago, repasse]
last_updated: 2026-07-23
---

<!-- ai-summary
System: pagamento de consulta via PIX ou cartao usando endpoints /v1/pagamentos.
Flow: criar pagamento -> exibir checkout/QR -> polling sync -> retorno checkout com sync imediato -> confirmar status final.
Owner: frontend.
Systems: src/pages/Payment.tsx, src/services/api.ts, src/pages/PaymentSuccess.tsx, src/pages/PaymentPending.tsx, src/pages/PaymentFailure.tsx.
Status: review.
-->

# Processo de Pagamento da Consulta

## Origem e evidencias

- Evidencia principal: src/pages/Payment.tsx
- Evidencia principal: src/services/api.ts
- Evidencia complementar: GO-LIVE-CHECKLIST.md

> Migrado e reconciliado de GO-LIVE-CHECKLIST.md (itens de fluxo de receita e polling).

## Fluxo PIX

1. Tela Payment recebe consultaId (state, query ou sessionStorage).
2. criarPagamento({ consultaId, metodoPagamento: 'pix' }) chama POST /v1/pagamentos/pix.
3. UI exibe QR (qrCode/qrCodeBase64/ticketUrl) e validade.
4. Polling chama syncPagamento(consultaId) em intervalo de 5s.
5. Quando status vira PAGO, redireciona para /dashboard.

## Fluxo Cartao

1. criarPagamento({ consultaId, metodoPagamento: 'card' }) chama POST /v1/pagamentos/cartao.
2. UI redireciona para initPoint/sandboxInitPoint do Mercado Pago.
3. No retorno para /payment/success, /payment/pending ou /payment/failure, a tela executa syncPagamento(consultaId) uma vez para reconciliar status.
4. Se o backend retornar status PAGO no retorno pending/failure, a UI redireciona automaticamente para /payment/success.

## Regras e contratos

- Endpoints de pagamento usam prefixo /v1.
- Campo canonico de confirmacao e pagamento.status.
- Polling para em status final nao pendente.

## Repasse ao medico

> Decisao de negocio: ver [ADR 0002 - Estrategia de Repasse ao Medico](../decisions/adr-0002-estrategia-repasse-medico.md).

- O valor liquido das consultas pagas se acumula em `saldo_a_liberar` (GET /medicos/me/saldo).
- Repasse padrao e **automatico**: ocorre no ciclo semanal (toda segunda-feira), sem acao
  manual do medico ou da operacao.
- O medico pode solicitar **repasse imediato** (antecipacao) do saldo disponivel antes do
  proximo ciclo. Essa solicitacao **cobra uma taxa**, retida integralmente pela plataforma e
  descontada do valor antecipado. A UI exibe o valor da taxa e o valor liquido antes da
  confirmacao (src/pages/Earnings.tsx).
- Contrato do endpoint de repasse imediato (enquanto o backend nao confirma um contrato
  definitivo, o frontend assume e documenta este formato):
  - `POST /medicos/me/repasses/imediato`
  - Corpo: `{}` (usa o saldo disponivel integral) ou `{ "valorCentavos": number }` para
    antecipar parte do saldo.
  - Resposta esperada: `{ "taxaCentavos": number, "valorLiquidoCentavos": number, "repasse": Repasse }`.
  - Erros: se o medico nao tiver saldo disponivel ou dados bancarios cadastrados, a API deve
    retornar erro 4xx com mensagem tratavel pela UI.

## Nota de reconciliacao

- O gap de sincronizacao no retorno de checkout foi resolvido em 2026-06-17 com sync imediato nas telas de retorno.
- Estrategia de repasse ao medico definida em 2026-07-23 (ver ADR 0002) — deixa de ser um item "em breve" do go-live.
