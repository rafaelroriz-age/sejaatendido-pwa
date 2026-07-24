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
last_updated: 2026-07-23
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

1. ~~O fluxo de login social Google deve ser reativado na UI ou removido do checklist operacional?~~
   - [x] Decidido em 2026-07-23: fluxo de login com Google foi retirado da UI e do checklist operacional (não sera reativado).
2. O service worker de push deve registrar em sw.js ou usar diretamente o worker gerado pelo vite-plugin-pwa?
3. Quais dados legais reais substituem os placeholders em src/config/legal.ts?
   - [x] CNPJ, endereco e canal de contato do titular (contato@sejaatendido.api.br) ja preenchidos em src/config/legal.ts.
   - [x] SLA de resposta ao titular definido em 48 horas (prazoResposta em src/config/legal.ts).
   - [ ] Ainda pendente: razao social oficial, nome/contato do DPO, foro contratual e data de vigencia.
4. Qual sera o contrato canonico do backend para envio WhatsApp (endpoint unico, payload oficial e formato de numero: local vs E.164)?
   - [x] Esclarecido em 2026-07-23: o envio da mensagem WhatsApp e feito diretamente pela API da Meta (WhatsApp Cloud API); a SALVY e usada apenas como fonte/validacao do numero de telefone, nao como integrador de envio.
   - [ ] Ainda pendente: endpoint canonico unico no backend (hoje o frontend usa fallback em 3 rotas), payload oficial aceito pela Meta API e formato de numero exigido (Meta Cloud API normalmente exige E.164, a confirmar com o backend).
