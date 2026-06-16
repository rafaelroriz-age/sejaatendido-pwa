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
last_updated: 2026-06-16
---

<!-- ai-summary
System: paciente agenda consulta escolhendo medico, data e slot disponivel.
Flow: listar medicos -> selecionar data -> carregar slots -> validar horario futuro -> criar consulta -> ir para pagamento.
Owner: frontend.
Systems: src/pages/BookAppointment.tsx, src/services/api.ts.
Status: review.
-->

# Processo de Agendamento de Consulta

## Origem e evidencias

- Evidencia principal: src/pages/BookAppointment.tsx
- Evidencia principal: src/services/api.ts

## Fluxo atual

1. Carrega medicos via fetchMedicos().
2. Usuario escolhe medico e data.
3. Frontend consulta disponibilidade via fetchDisponibilidadeMedico(medicoIds, data).
4. Se API nao retornar slots, usa fallback local de 06:00 a 00:00 em intervalos de 30 minutos.
5. Frontend bloqueia horarios passados comparando slot selecionado com Date.now().
6. Ao confirmar, chama createConsulta com medicoId candidato + dataHora.
7. Em sucesso, redireciona para /payment com consultaId e valor.

## Tratamento de falhas observado

- Se medicoId falhar com 404/400 especifico, tenta IDs alternativos do medico.
- Em 409 de conflito de agenda, recarrega slots e solicita novo horario.
- Busca consulta recem-criada como fallback de consistencia (findRecentlyCreatedConsulta).

## Observacao de consistencia

- Texto de marketing em src/pages/LandingPage.tsx fala em "18 slots diarios".
- Implementacao real usa quantidade dinamica da API e fallback de meia em meia hora.
- Ver divergencia registrada em ../plans/divergencias.md.
