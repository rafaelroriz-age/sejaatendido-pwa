---
title: Processo de Notificacoes e Preferencias
type: process
status: review
confidence: 0.80
owner: frontend
related:
  - ../systems/api-backend-e-contratos.md
  - ../decisions/adr-0001-fallback-endpoints-notificacao.md
  - ../plans/duvidas-abertas.md
tags: [notificacao, push, whatsapp, preferencia]
last_updated: 2026-06-17
---

<!-- ai-summary
System: gerencia preferencias de notificacao com fallback de endpoints e persistencia local.
Flow: carregar preferencias -> editar canais/eventos -> salvar backend -> fallback local -> teste WhatsApp.
Owner: frontend.
Systems: src/pages/NotificationPreferences.tsx, src/services/api.ts.
Status: review.
-->

# Processo de Notificacoes e Preferencias

## Origem e evidencias

- Evidencia principal: src/pages/NotificationPreferences.tsx
- Evidencia principal: src/services/api.ts

## Fluxo atual

1. Tela carrega preferencias por fetchPreferenciasNotificacao() e dados de perfil por fetchPerfil().
2. Usuario configura canais (push/email/WhatsApp) e eventos (confirmacao, lembretes, cancelamentos, prescricoes).
3. savePreferenciasNotificacao tenta salvar em tres endpoints alternativos.
4. Em indisponibilidade dos endpoints de notificacao (404/405), frontend usa fallback localStorage.
5. Teste de WhatsApp tenta multiplos endpoints em sequencia (testarNotificacaoWhatsapp).

## Diagnostico rapido (SALVY)

- Frontend nao integra Twilio diretamente; o envio real depende do backend/integrador SALVY.
- Endpoints de teste de WhatsApp exigem autenticacao Bearer valida.
- O frontend tenta variacoes de formato de numero no teste (nacional e E.164 BR) para reduzir falsos negativos de contrato.

### Evidencia operacional (2026-06-17)

- POST /notificacoes/whatsapp-test sem token -> 401 `{"erro":"Token não fornecido"}`
- POST /notificacoes/whatsapp/teste sem token -> 401 `{"erro":"Token não fornecido"}`
- POST /usuarios/me/notificacoes/whatsapp/teste sem token -> 401 `{"erro":"Token não fornecido"}`

## Validacao recomendada no backend

1. Logar payload recebido no endpoint de teste (sanitizado, sem dados sensiveis).
2. Logar chamada ao SALVY com status HTTP, body resumido e codigo de erro.
3. Confirmar formato aceito para destino WhatsApp: local (11 digitos) vs E.164 (+55...).
4. Definir endpoint canonico unico para teste WhatsApp e manter aliases apenas durante transicao.

## Push web

- Tela registra service worker em ${import.meta.env.BASE_URL}sw.js.
- registerPushToken no service ignora plataforma diferente de IOS/ANDROID, logo payload web-pwa nao e enviado ao backend.

## Risco conhecido

- Necessario validar estrategia final de push web (endpoint/plataforma) para evitar falsa percepcao de cadastro de token.
- Ver ../plans/duvidas-abertas.md.
