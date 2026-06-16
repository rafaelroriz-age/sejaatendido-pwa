---
title: Hub de Documentacao do Projeto
type: knowledge
status: review
confidence: 0.80
owner: engenharia
related:
  - CONVENTIONS.md
  - plans/inventario.md
  - ../MEMORY.md
tags: [indice, docs, segundo-cerebro]
last_updated: 2026-06-16
---

<!-- ai-summary
System: indice navegavel do segundo cerebro textual do projeto.
Flow: abrir hub -> escolher categoria -> ler ai-summary -> aprofundar no doc.
Owner: engenharia.
Systems: docs/, MEMORY.md.
Status: review.
-->

# Documentacao - Seja Atendido PWA

Este hub consolida a base textual do Segundo Cerebro para onboarding humano e uso por IA.

## Convencoes

- [Convencoes do Segundo Cerebro](CONVENTIONS.md)

## Processos

- [Processo de Autenticacao e Autorizacao](processes/autenticacao-e-autorizacao.md) - Login, sessao e protecao de rotas por papel.
- [Processo de Agendamento de Consulta](processes/agendamento-consulta.md) - Escolha de medico/data/horario e criacao de consulta.
- [Processo de Pagamento da Consulta](processes/pagamentos-consulta.md) - Fluxos PIX/cartao e sincronizacao de status.
- [Processo de Notificacoes e Preferencias](processes/notificacoes-e-preferencias.md) - Canais, preferencias e fallback de notificacao.

## Sistemas

- [Sistema de API Backend e Contratos](systems/api-backend-e-contratos.md) - Endpoints, interceptors, refresh token e normalizacao.
- [Sistema de Build, PWA e Deploy Web](systems/pwa-build-e-deploy.md) - Vite, PWA, Docker e Nginx.

## Decisoes

- [ADR 0001 - Fallback de Endpoints para Notificacoes](decisions/adr-0001-fallback-endpoints-notificacao.md)

## Conhecimento de dominio

- [Dominio do Produto e Papeis de Usuario](knowledge/dominio-e-papeis.md)

## Planos e governanca

- [Inventario de Conhecimento Existente](plans/inventario.md)
- [Divergencias Entre Documentacao e Codigo](plans/divergencias.md)
- [Duvidas Abertas](plans/duvidas-abertas.md)
- [Roadmap do Segundo Cerebro](plans/segundo-cerebro-roadmap.md)

## Ponto de partida recomendado

1. Ler ../MEMORY.md
2. Ler os ai-summaries dos processos
3. Abrir divergencias e duvidas antes de alterar fluxos criticos
