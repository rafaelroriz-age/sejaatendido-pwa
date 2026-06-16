---
title: Divergencias Entre Documentacao e Codigo
type: plan
status: review
confidence: 0.80
owner: engenharia
related:
  - inventario.md
  - ../processes/pagamentos-consulta.md
  - ../processes/autenticacao-e-autorizacao.md
tags: [divergencias, doc-vs-codigo, riscos]
last_updated: 2026-06-16
---

<!-- ai-summary
System: lista conflitos entre material textual existente e comportamento real do repositorio.
Flow: comparar fonte textual -> validar no codigo -> registrar impacto.
Owner: engenharia.
Systems: GO-LIVE-CHECKLIST, paginas de login/pagamento/landing.
Status: review.
-->

# Divergencias Entre Documentacao e Codigo

Regra aplicada: quando houver conflito, o codigo e a fonte da verdade.

| Tema | Fonte textual | Evidencia no codigo | Situacao |
|---|---|---|---|
| Login social Google em producao | GO-LIVE-CHECKLIST.md (item bloqueante) pede validacao de login Google | src/services/api.ts expoe loginGoogleRequest, mas src/pages/LoginScreen.tsx nao possui botao/fluxo Google | atualizar docs e backlog de implementacao |
| Numero de slots no agendamento | src/pages/LandingPage.tsx cita "18 slots diarios (06h a 00h)" | src/pages/BookAppointment.tsx cria fallback a cada 30 min de 06:00 ate 00:00 (37 slots possiveis) + slots reais vindos da API | atualizar texto de marketing para nao fixar quantidade |
| Nome do arquivo de prompt em ingles | my_step_by_step_second_brain_existing_project.md cita prompt_second_brain_existing_project.md | arquivo existente no repo e prompt_segundo_cerebro_projeto_existente.md | atualizar referencia de arquivo no guia em ingles |
| Pos-retorno de checkout | expectativa comum de confirmacao final apos redirecionamento | src/pages/PaymentSuccess.tsx exibe query params, mas nao chama syncPagamento | manter como risco conhecido em roadmap |
