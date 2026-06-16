---
title: Inventario de Conhecimento Existente
type: plan
status: review
confidence: 0.80
owner: engenharia
related:
  - divergencias.md
  - duvidas-abertas.md
  - ../README.md
tags: [inventario, migracao, documentacao]
last_updated: 2026-06-16
---

<!-- ai-summary
System: inventario dos itens de maior valor encontrados no repositorio e acao de migracao.
Flow: mapear evidencia -> classificar acao -> priorizar docs.
Owner: engenharia.
Systems: codigo fonte, checklist go-live, configuracoes.
Status: review.
-->

# Inventario de Conhecimento Existente

| Item de conhecimento | Evidencia (origem) | Acao |
|---|---|---|
| Fluxo de autenticacao e papeis (PACIENTE, MEDICO, ADMIN) | src/App.tsx, src/pages/LoginScreen.tsx, src/storage/localStorage.ts | criar |
| Fluxo de agendamento com disponibilidade e fallback de horarios | src/pages/BookAppointment.tsx, src/services/api.ts | criar |
| Fluxo de pagamento PIX/cartao com polling de status | src/pages/Payment.tsx, src/services/api.ts, src/pages/PaymentSuccess.tsx | criar |
| Preferencias de notificacao com fallback de endpoints | src/pages/NotificationPreferences.tsx, src/services/api.ts | criar |
| Contratos da API e estrategia de tolerancia a variacoes de payload | src/services/api.ts, src/config/api.ts | criar |
| Configuracao de mock em dev e bloqueio de mock em prod | src/main.tsx, src/vite-env.d.ts | criar |
| Build PWA e cache runtime para API | vite.config.ts | criar |
| Deploy web com Docker + Nginx + SPA fallback | Dockerfile, docker-compose.yml, nginx.conf | criar |
| Checklist de go-live operacional | GO-LIVE-CHECKLIST.md | migrar |
| Conteudo legal com placeholders pendentes | src/config/legal.ts, src/pages/TermsOfUse.tsx, src/pages/PrivacyPolicy.tsx | atualizar |

## Prioridade desta rodada (top 10)

1. Autenticacao e autorizacao
2. Agendamento
3. Pagamentos
4. Notificacoes
5. API e contratos
6. PWA/build/deploy
7. Dominio e papeis
8. ADR de fallback de endpoints
9. Divergencias doc x codigo
10. Roadmap de proximas camadas
