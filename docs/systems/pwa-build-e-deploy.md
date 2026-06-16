---
title: Sistema de Build, PWA e Deploy Web
type: system
status: review
confidence: 0.80
owner: frontend
related:
  - api-backend-e-contratos.md
  - ../plans/duvidas-abertas.md
  - ../plans/divergencias.md
tags: [vite, pwa, docker, nginx, deploy]
last_updated: 2026-06-16
---

<!-- ai-summary
System: build com Vite + plugin PWA e deploy estatico via Nginx em container Docker.
Flow: npm run build -> dist -> imagem nginx -> fallback SPA no servidor.
Owner: frontend.
Systems: vite.config.ts, Dockerfile, docker-compose.yml, nginx.conf, src/main.tsx.
Status: review.
-->

# Sistema de Build, PWA e Deploy Web

## Origem e evidencias

- Evidencia principal: package.json
- Evidencia principal: vite.config.ts
- Evidencia principal: Dockerfile
- Evidencia principal: docker-compose.yml
- Evidencia principal: nginx.conf
- Evidencia principal: src/main.tsx

## Pipeline de build

1. npm run build executa tsc e vite build.
2. VitePWA gera manifest + service worker para modo standalone.
3. Docker build gera assets em dist e publica com nginx:alpine.

## Regras de runtime relevantes

- src/main.tsx bloqueia VITE_MOCK=true em producao.
- Em dev com VITE_MOCK=true, inicializa MSW (src/mocks/browser.ts).
- nginx.conf usa try_files para fallback SPA em /index.html.

## Cache e PWA

- Plugin PWA define cache runtime NetworkFirst para backend onrender.
- Workbox limpa caches obsoletos e inclui assets web padrao.

## Riscos operacionais

- Push web registra sw.js em runtime da tela de notificacoes, enquanto PWA gera worker pelo plugin.
- Necessario validar estrategia unica de service worker para evitar inconsistencias.
