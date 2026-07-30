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
last_updated: 2026-06-17
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
| Login social Google em producao | GO-LIVE-CHECKLIST.md pedia validacao de login Google | Decidido em 2026-07-23: fluxo Google removido de src/pages/LoginScreen.tsx e src/services/api.ts (loginGoogleRequest) | resolvido em 2026-07-23 |
| Numero de slots no agendamento | src/pages/LandingPage.tsx cita "18 slots diarios (06h a 00h)" | src/pages/BookAppointment.tsx cria fallback a cada 30 min de 06:00 ate 00:00 (37 slots possiveis) + slots reais vindos da API | atualizar texto de marketing para nao fixar quantidade |
| Nome do arquivo de prompt em ingles | my_step_by_step_second_brain_existing_project.md cita prompt_second_brain_existing_project.md | arquivo existente no repo e prompt_segundo_cerebro_projeto_existente.md | atualizar referencia de arquivo no guia em ingles |
| Pos-retorno de checkout | expectativa comum de confirmacao final apos redirecionamento | src/pages/PaymentSuccess.tsx, src/pages/PaymentPending.tsx e src/pages/PaymentFailure.tsx executam syncPagamento no carregamento | resolvido em 2026-06-17 |
| Fallback mock em detalhe de repasse | risco de mascarar erro real de backend em tela financeira | src/pages/RepasseDetail.tsx agora exibe erro e botao de retry quando API falha | resolvido em 2026-06-17 |
| ID incorreto na navegacao para detalhe de repasse | Earnings.tsx navegava para `/repasse/:id` usando o id do repasse individual | src/pages/RepasseDetail.tsx chama `GET /medicos/me/ciclos-repasse/:id`, que espera o id do CICLO de repasse, nao o do repasse individual — causava erro real ("Nao foi possivel carregar os detalhes do repasse") em producao | resolvido em 2026-07-22: fetchRepasses agora expoe `cicloRepasseId` e Earnings.tsx navega com ele |
| Erro ao abrir o repasse mais recente ("da conta atual") a partir do Historico | mesmo apos o fix de 2026-07-22, o repasse do ciclo em processamento (mais recente) ainda podia falhar ao abrir o detalhe | `GET /medicos/me/ciclos-repasse/:id` pode retornar erro para um ciclo ainda em processamento; RepasseDetail.tsx dependia exclusivamente dessa chamada mesmo quando os dados ja estavam disponiveis na listagem | mitigado em 2026-07-23: Earnings.tsx envia o repasse via `navigate(..., { state: { repasse } })` e RepasseDetail.tsx exibe esses dados de imediato, tentando so enriquecer em segundo plano (sem exibir erro se essa chamada falhar) |
| Endpoint de detalhe de repasse trocado pelo backend | backend confirmou que o detalhe deve ser buscado por `GET /medicos/me/repasses/{repasse.id}` (id do repasse individual), nao mais pelo ciclo (`/medicos/me/ciclos-repasse/:id`) | src/services/api.ts (`fetchRepasseById`) e src/pages/Earnings.tsx navegavam/buscavam pelo id do ciclo (`cicloRepasseId`) | resolvido em 2026-07-23: `fetchRepasseById` agora chama `GET /medicos/me/repasses/:id`, Earnings.tsx navega sempre com `r.id`, e o campo `cicloRepasseId` foi removido de `Repasse` |
| Contrato do PATCH de aceite/recusa/conclusao de consulta pelo medico | src/services/api.ts (`updateConsultaMedico`) enviava `{ acao: "ACEITAR"|"RECUSAR"|"FINALIZAR" }` para `PATCH /medicos/me/consultas/:id` | Teste em producao (2026-07-30) mostrou o backend retornando `400` esperando `{ status: "ACEITA"|"RECUSADA"|"CONCLUIDA" }` | **resolvido em 2026-07-30 (frontend)**: `updateConsultaMedico` agora envia `{ status, motivoRecusa? }` (teste `src/services/updateConsultaMedico.test.ts`). Falta o backend confirmar que persiste esse status e gera o `meetLink` ao aceitar (ver bug de persistencia relacionado) |

