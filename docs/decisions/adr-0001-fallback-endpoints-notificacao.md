---
title: ADR 0001 - Fallback de Endpoints para Notificacoes
type: decision
status: review
confidence: 0.80
owner: frontend
related:
  - ../processes/notificacoes-e-preferencias.md
  - ../systems/api-backend-e-contratos.md
  - ../plans/duvidas-abertas.md
tags: [adr, notificacao, fallback, compatibilidade]
last_updated: 2026-06-16
---

<!-- ai-summary
System: decisao de tolerar variacoes de API usando lista de endpoints para notificacoes e WhatsApp.
Flow: tentar endpoint A -> 404/405 -> tentar B -> fallback local.
Owner: frontend.
Systems: src/services/api.ts.
Status: review.
-->

# ADR 0001 - Fallback de Endpoints para Notificacoes

## Contexto

A camada de notificacoes no frontend conversa com ambientes que podem expor rotas diferentes para o mesmo recurso.

Evidencia:

- src/services/api.ts usa listas de endpoints para preferencias e teste WhatsApp.

## Decisao

Adotar estrategia de tentativas sequenciais por endpoint para:

- leitura e gravacao de preferencias de notificacao;
- teste de envio de WhatsApp.

Quando nenhum endpoint responde de forma compativel, manter persistencia local para preferencias sem bloquear UX.

## Consequencias

Positivas:

- maior resiliencia a variacoes de backend/ambiente;
- menor chance de quebra total em deploys parciais.

Negativas:

- aumenta complexidade de observabilidade;
- pode mascarar contrato API inconsistente por mais tempo.

Acoes de acompanhamento:

- definir endpoint canonico unico e plano de deprecacao;
- revisar estrategia de fallback apos padronizacao de backend.
