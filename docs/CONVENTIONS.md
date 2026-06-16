---
title: Convencoes do Segundo Cerebro
type: knowledge
status: review
confidence: 0.80
owner: engenharia
related:
  - plans/inventario.md
  - README.md
tags: [documentacao, convencoes, segundo-cerebro]
last_updated: 2026-06-16
---

<!-- ai-summary
System: define padrao de frontmatter, ai-summary e confidence para docs versionados.
Flow: criar doc -> aplicar schema -> calcular confidence -> revisar status.
Owner: engenharia.
Systems: docs/, MEMORY.md.
Status: review.
-->

# Convencoes do Segundo Cerebro

## Frontmatter obrigatorio
Todo arquivo markdown em docs/ deve iniciar com:

```yaml
---
title: <titulo legivel>
type: <process | system | decision | knowledge | meeting | plan>
status: <draft | review | validated>
confidence: <numero de 0.00 a 1.00>
owner: <time ou pessoa responsavel, se conhecido>
related:
  - <caminho/relativo/para/outro-doc.md>
tags: [<termo>, <termo>]
last_updated: <AAAA-MM-DD>
---
```

## Formato do ai-summary
Logo abaixo do frontmatter:

```html
<!-- ai-summary
System: <o que este doc cobre em uma linha>
Flow: <passo -> passo -> passo>
Owner: <responsavel>
Systems: <sistemas/integrações citados>
Status: <validated | review | draft>
-->
```

Regra: resumo denso, curto e suficiente para decidir se vale abrir o doc inteiro.

## Rubrica de confidence
Some os pesos atendidos (maximo 1.00):

- Freshness (atualizado em ~90 dias): 0.25
- Status validated: 0.20
- Possui ai-summary: 0.15
- Tem cross-links (related + links no corpo): 0.15
- Completude do tema: 0.15
- Bate com o codigo atual: 0.10

Interpretacao:

- 0.00-0.39: suspeito, manter draft
- 0.40-0.69: util, mas requer revisao
- 0.70-1.00: forte para onboarding e contexto de IA
