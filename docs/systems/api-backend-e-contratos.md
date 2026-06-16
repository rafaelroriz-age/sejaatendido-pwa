---
title: Sistema de API Backend e Contratos
type: system
status: review
confidence: 0.80
owner: frontend
related:
  - ../processes/autenticacao-e-autorizacao.md
  - ../processes/agendamento-consulta.md
  - ../processes/pagamentos-consulta.md
  - ../processes/notificacoes-e-preferencias.md
tags: [api, backend, contratos, axios]
last_updated: 2026-06-16
---

<!-- ai-summary
System: camada HTTP centralizada com axios, auth bearer e refresh token automatico.
Flow: request interceptor -> resposta/refresh 401 -> normalizacao de payloads -> fallback de endpoints.
Owner: frontend.
Systems: src/services/api.ts, src/config/api.ts.
Status: review.
-->

# Sistema de API Backend e Contratos

## Origem e evidencias

- Evidencia principal: src/services/api.ts
- Evidencia principal: src/config/api.ts

## Base URL e ambiente

- API_URL usa VITE_API_URL (ou NEXT_PUBLIC_API_URL por compatibilidade).
- Em dev, fallback local para http://localhost:3000.
- Em prod sem variavel definida, loga warning e usa default https://sejaatendido-backend.onrender.com.

## Autenticacao HTTP

- Interceptor injeta Authorization: Bearer <token>.
- Em 401, tenta refresh em /auth/refresh-token.
- Se refresh falhar, limpa sessao local.

## Endpoints relevantes observados

- Auth: /auth/login, /auth/registro, /auth/google, /auth/apple.
- Consultas/agendamento: /medicos, /medicos/:id/slots, createConsulta (no mesmo service).
- Pagamentos: /v1/pagamentos/pix, /v1/pagamentos/cartao, /v1/pagamentos/sync/:consultaId.
- Notificacoes: multiplos endpoints para preferencias e teste WhatsApp (fallback por tentativas).

## Estrategia de robustez

- Normalizacao de payloads para lidar com variacoes de shape do backend.
- Fallback de endpoints 404/405 em preferencias e WhatsApp.
- Telemetria de eventos frontend com fallback local quando endpoint nao existe.
