---
title: Processo de Autenticacao e Autorizacao
type: process
status: review
confidence: 0.80
owner: frontend
related:
  - ../systems/api-backend-e-contratos.md
  - ../knowledge/dominio-e-papeis.md
  - ../plans/divergencias.md
tags: [auth, login, roles, sessao]
last_updated: 2026-06-16
---

<!-- ai-summary
System: login por email/senha ou CPF/senha com rotas protegidas por papel de usuario.
Flow: credenciais -> /auth/login -> salvar sessao local -> redirecionar por role -> proteger rotas.
Owner: frontend.
Systems: src/pages/LoginScreen.tsx, src/App.tsx, src/storage/localStorage.ts, src/services/api.ts.
Status: review.
-->

# Processo de Autenticacao e Autorizacao

## Origem e evidencias

- Evidencia principal: src/pages/LoginScreen.tsx
- Evidencia principal: src/services/api.ts
- Evidencia principal: src/storage/localStorage.ts
- Evidencia principal: src/App.tsx

## Fluxo atual

1. Usuario escolhe modo de login em src/pages/LoginScreen.tsx.
2. Paciente/admin envia email+senha (loginRequest); medico envia CPF+senha (loginCpfRequest).
3. Em sucesso, token/refreshToken e usuario sao gravados via saveAuthSession.
4. App resolve rota inicial por role:
   - ADMIN -> /admin
   - MEDICO -> /doctor
   - PACIENTE -> /dashboard
5. Rotas autenticadas usam ProtectedRoute em src/App.tsx, que valida sessao em getAuthSession().

## Regras importantes

- Interceptor de resposta em src/services/api.ts tenta refresh em 401 antes de limpar sessao.
- Sem token ou usuario valido, ProtectedRoute redireciona para /login.
- Role fora da lista allow redireciona para home da propria role.

## Pontos de atencao

- loginGoogleRequest existe em src/services/api.ts, mas nao esta conectado a UI atual. Ver divergencia em ../plans/divergencias.md.
