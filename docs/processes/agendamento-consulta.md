---
title: Processo de Agendamento de Consulta
type: process
status: review
confidence: 0.80
owner: frontend
related:
  - ../systems/api-backend-e-contratos.md
  - pagamentos-consulta.md
  - ../knowledge/dominio-e-papeis.md
tags: [agendamento, consulta, disponibilidade]
last_updated: 2026-07-25
---

<!-- ai-summary
System: paciente agenda consulta escolhendo medico, data e slot disponivel.
Flow: listar medicos -> selecionar data -> carregar slots -> validar horario futuro -> criar consulta -> ir para dashboard (pagamento so libera apos consulta CONCLUIDA via cron).
Owner: frontend.
Systems: src/pages/BookAppointment.tsx, src/pages/Dashboard.tsx, src/services/api.ts.
Status: review.
-->

# Processo de Agendamento de Consulta

## Origem e evidencias

- Evidencia principal: src/pages/BookAppointment.tsx
- Evidencia principal: src/pages/Dashboard.tsx
- Evidencia principal: src/services/api.ts

## Fluxo atual

1. Carrega medicos via fetchMedicos().
2. Usuario escolhe medico e data.
3. Frontend consulta disponibilidade via fetchDisponibilidadeMedico(medicoIds, data).
4. Se API nao retornar slots, usa fallback local de 06:00 a 00:00 em intervalos de 30 minutos.
5. Frontend bloqueia horarios passados comparando slot selecionado com Date.now().
6. Ao confirmar, chama createConsulta com medicoId candidato + dataHora. A consulta e criada com status PENDENTE.
7. Em sucesso, redireciona para /dashboard (nao para /payment) com state `{ bookingConfirmed: true }`.

## Fluxo pos-agendamento ate o pagamento (atualizado)

O agendamento **nao** redireciona direto para a tela de pagamento. O motivo e uma regra de negocio do backend: um pagamento so pode ser criado quando a consulta esta com status `CONCLUIDA`, o que so ocorre minutos apos o horario marcado (via cron de auto-conclusao no backend, com atraso esperado de alguns minutos). Ver `src/pages/Dashboard.tsx` (`canPayConsulta`, `isAwaitingConclusion`).

1. Apos agendar, o paciente cai no Dashboard com uma mensagem informando que o pagamento sera liberado automaticamente apos a consulta ser concluida.
2. O medico precisa aceitar a consulta (acao `ACEITAR` via `PATCH /medicos/me/consultas/:id`) antes ou depois do horario marcado — a aceitacao muda o status para `ACEITA` e, no backend, deveria gerar o `meetLink` (sala de videochamada) neste momento.
3. O Dashboard do paciente faz polling silencioso a cada 30s (`CONSULTAS_POLL_INTERVAL_MS`) para detectar tanto a transicao `PENDENTE -> ACEITA` (meetLink passa a existir) quanto a conclusao automatica da consulta.
4. Quando o backend marca a consulta como `CONCLUIDA` (cron, ~10min apos o horario), o botao "Pagar consulta" aparece no Dashboard e o fluxo de pagamento (`/payment`) e liberado.
5. O pagamento em si (Pix/cartao via Mercado Pago) e tratado em `pagamentos-consulta.md`.

> Ver `../decisions/adr-0001-fallback-endpoints-notificacao.md` e `pagamentos-consulta.md` para detalhes da integracao de pagamento.

## Bug conhecido (2026-07): meetLink nao gerado ao aceitar

Foi observado que `PATCH /medicos/me/consultas/:id` com `acao: "ACEITAR"` responde `200` mas **nao persiste** a mudanca de status no backend (a consulta volta a aparecer como `PENDENTE` num refetch). Como consequencia, o `meetLink` — que so e gerado pelo backend no momento em que a consulta passa a `ACEITA` — nunca chega a existir, mesmo para consultas que depois sao concluidas (`CONCLUIDA`) e pagas pelo cron. Isso impede paciente e medico de "Entrar na Consulta" (video chamada), embora o pagamento funcione normalmente.

- Isso e um bug de **backend** (persistencia do PATCH + geracao do meetLink), nao do frontend: o frontend ja faz atualizacao otimista + refetch (`handleUpdateConsulta` em `src/pages/DoctorDashboard.tsx`) e ja trata `meetLink` ausente sem quebrar a UI (oculta o botao de entrar / usa fallback para o chat).
- Ver `../plans/duvidas-abertas.md` e `../plans/pendencias-somente-usuario-passo-a-passo.md` para acompanhamento.

## Valor da consulta no frontend

- O medico configura seu valor de consulta no frontend em `src/pages/Profile.tsx` (campo "Valor da consulta (R$)").
- O salvamento do valor usa `updateMedicoPerfil({ valorConsulta })` em `src/services/api.ts`.
- A tela de agendamento (`src/pages/BookAppointment.tsx`) exibe o valor por medico no card de selecao, facilitando a comparacao pelo paciente.
- Quando o backend ainda nao retorna valor para um medico, a UI mostra "A combinar" como fallback visual.
- `Consulta.valor` (retornado por `/medicos/me/consultas` e similares) esta em **centavos**, mesma convencao usada em `Payment.tsx` e `BookAppointment.tsx` (`valor / 100`).

## Tratamento de falhas observado

- Se medicoId falhar com 404/400 especifico, tenta IDs alternativos do medico.
- Em 409 de conflito de agenda, recarrega slots e solicita novo horario.
- Busca consulta recem-criada como fallback de consistencia (findRecentlyCreatedConsulta).

## Observacao de consistencia

- Texto de marketing em src/pages/LandingPage.tsx fala em "18 slots diarios".
- Implementacao real usa quantidade dinamica da API e fallback de meia em meia hora.
- Ver divergencia registrada em ../plans/divergencias.md.
