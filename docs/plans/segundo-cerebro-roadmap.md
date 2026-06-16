---
title: Roadmap do Segundo Cerebro
type: plan
status: review
confidence: 0.80
owner: engenharia
related:
  - inventario.md
  - duvidas-abertas.md
  - ../CONVENTIONS.md
tags: [roadmap, segundo-cerebro, proximas-camadas]
last_updated: 2026-06-16
---

<!-- ai-summary
System: backlog das proximas camadas apos base textual.
Flow: consolidar docs -> padronizar operacao -> automatizar validacoes e impacto.
Owner: engenharia.
Systems: skills, impacto, MCP, quality gates.
Status: review.
-->

# Roadmap do Segundo Cerebro

## Camada concluida nesta fase

- Base textual versionada em docs/
- Convencoes (frontmatter, ai-summary, confidence)
- Inventario, divergencias e duvidas abertas
- MEMORY.md inicial

## Proximas fases (nao implementadas agora)

1. Skills operacionais
Entrega: skills/validate.md, skills/impact.md, skills/prime.md.
Por que depois: primeiro era necessario estabilizar a base documental.

2. Impact analysis semiautomatica
Entrega: procedimento padrao de impacto antes de mudancas de codigo.
Por que depois: precisa combinar docs + referencias de simbolos no codigo.

3. Integracao MCP para fluxos repetitivos
Entrega: comandos assistidos para validacao de docs e atualizacao de confidence.
Por que depois: depende de definicao final das skills e governanca.

4. Automacao de confidence
Entrega: checagem automatica de freshness, related quebrado e status.
Por que depois: requer script/CI e regra de excecoes.

5. Quality gates para PR
Entrega: checklist de docs obrigatorios por tipo de mudanca.
Por que depois: depende de rotina consolidada da equipe.
