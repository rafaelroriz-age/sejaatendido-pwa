---
title: Dominio do Produto e Papeis de Usuario
type: knowledge
status: review
confidence: 0.80
owner: produto
related:
  - ../processes/autenticacao-e-autorizacao.md
  - ../processes/agendamento-consulta.md
  - ../processes/pagamentos-consulta.md
tags: [dominio, saude, papeis, produto]
last_updated: 2026-06-16
---

<!-- ai-summary
System: contexto funcional do produto de telemedicina e papeis com permissoes principais.
Flow: paciente agenda e paga -> medico atende e gerencia agenda -> admin governa operacao.
Owner: produto.
Systems: src/App.tsx, src/pages/LandingPage.tsx, src/pages/DoctorSchedule.tsx.
Status: review.
-->

# Dominio do Produto e Papeis de Usuario

## Visao do dominio

Seja Atendido e uma PWA de telemedicina para conectar pacientes a medicos, com fluxo de agendamento, pagamento e acompanhamento.

Evidencias:

- src/pages/LandingPage.tsx
- src/App.tsx
- package.json

## Papeis e capacidades

- PACIENTE
  - agenda consulta;
  - realiza pagamento PIX/cartao;
  - acompanha status e notificacoes.

- MEDICO
  - acessa dashboard medico;
  - configura disponibilidade e bloqueios;
  - acompanha ganhos/repasse.

- ADMIN
  - acessa dashboard administrativo;
  - gerencia medicos/usuarios/consultas.

## Vocabulos recorrentes

- consulta
- disponibilidade / slot
- CRM validado
- repasse
- preferencias de notificacao
- pagamento (PIX/cartao)
