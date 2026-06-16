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
last_updated: 2026-06-16
---

<!-- ai-summary
System: pagamento de consulta via PIX ou cartao usando endpoints /v1/pagamentos.
Flow: criar pagamento -> exibir checkout/QR -> polling sync -> confirmar status final.
Owner: frontend.
Systems: src/pages/Payment.tsx, src/services/api.ts, src/pages/PaymentSuccess.tsx.
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

## Regras e contratos

- Endpoints de pagamento usam prefixo /v1.
- Campo canonico de confirmacao e pagamento.status.
- Polling para em status final nao pendente.

## Gap conhecido

- Paginas de retorno (PaymentSuccess/Pending/Failure) mostram parametros da URL, mas nao executam syncPagamento automaticamente.
- Gap registrado em ../plans/divergencias.md e ../plans/duvidas-abertas.md.
