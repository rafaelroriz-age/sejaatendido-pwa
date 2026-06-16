---
title: Duvidas Abertas
type: plan
status: draft
confidence: 0.55
owner: engenharia
related:
  - inventario.md
  - divergencias.md
  - ../systems/pwa-build-e-deploy.md
tags: [duvidas, bloqueios, validacao]
last_updated: 2026-06-16
---

<!-- ai-summary
System: pendencias que exigem confirmacao humana para elevar docs de review para validated.
Flow: identificar lacuna -> registrar pergunta -> acompanhar resposta.
Owner: engenharia.
Systems: legal, push notifications, pagamentos.
Status: draft.
-->

# Duvidas Abertas

> [!verificar] origem nao confirmada para os pontos abaixo no contexto de negocio final.

1. O fluxo de login social Google deve ser reativado na UI ou removido do checklist operacional?
2. O service worker de push deve registrar em sw.js ou usar diretamente o worker gerado pelo vite-plugin-pwa?
3. O retorno de checkout (PaymentSuccess/Pending/Failure) deve sincronizar automaticamente status via syncPagamento?
4. Quais dados legais reais substituem os placeholders em src/config/legal.ts (razao social, CNPJ, DPO, canal LGPD)?
5. O texto de produto deve fixar quantidade de slots ou apenas janela horaria dinamica?
