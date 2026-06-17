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
tags: [pagamento, pix, cartao, mercadopago]
last_updated: 2026-06-17
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

## Nota de reconciliacao

- O gap de sincronizacao no retorno de checkout foi resolvido em 2026-06-17 com sync imediato nas telas de retorno.
