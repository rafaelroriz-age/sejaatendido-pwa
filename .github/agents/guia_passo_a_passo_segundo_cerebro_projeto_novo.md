# Guia prático: como montar o seu Segundo Cérebro (passo a passo)

Baseado na palestra "Como o mercado praticamente te obriga a criar um segundo cérebro, e como fazê-lo" (CEIA Open Day 2026, Thiago Peraro).

A ideia central: o modelo de IA é commodity. O que te diferencia é o **contexto** que você dá pra ele. Este guia te leva camada por camada, do zero até um sistema que a IA lê, busca, pontua e opera. **Regra de ouro: não pule camada.** Quem pula etapa fragiliza o sistema inteiro.

Tempo estimado para a base mínima funcional: uma tarde. Depois vira hábito diário.

---

## Antes de começar: o que você vai precisar

- Uma pasta no seu computador e o **git** instalado (para versionar).
- Um editor de texto que você goste (VS Code é o ideal).
- Um assistente de IA com acesso aos seus arquivos (Claude Code, Cursor, ou equivalente).
- Nada além disso. Não é projeto grande, é hábito.

---

## Camada 1 — Conhecimento como código

**Objetivo:** tirar o conhecimento da sua cabeça e dos chats soltos, e colocá-lo em texto puro, versionado.

### Passo 1.1 — Crie a pasta e inicie o git
1. Crie uma pasta para o projeto (ex.: `segundo-cerebro`).
2. Abra o terminal nela e rode `git init`.
3. Crie uma subpasta `docs/`.

### Passo 1.2 — Crie a estrutura de tipos
Dentro de `docs/`, crie estas pastas. Cada uma guarda um tipo de conhecimento:

| Pasta | O que guarda |
|---|---|
| `processes/` | como cada fluxo de trabalho funciona |
| `systems/` | integrações, APIs e dependências externas |
| `decisions/` | ADRs — registros de "por que escolhemos X" |
| `knowledge/` | contexto, vocabulário, glossário, referências |
| `meetings/` | transcrições e resumos de reuniões |
| `plans/` | roadmap vivo |

### Passo 1.3 — Escreva o primeiro documento
Pegue **um** processo que você conhece de cabeça e escreva num `.md`. Não precisa ser perfeito. O ponto é começar. Versione com `git add` e `git commit`.

> Marco da camada: você já tem um segundo cérebro. Uma pasta de texto puro, versionada, legível por gente e por máquina ao mesmo tempo.

---

## Camada 1.5 — Frontmatter (metadados legíveis por máquina)

**Objetivo:** dar a cada documento um bloco que a IA consegue extrair, filtrar e indexar.

### Passo 1.4 — Adicione frontmatter no topo de cada doc
No começo de cada arquivo, cole um bloco YAML entre `---`:

```markdown
---
title: Processo de Devolução
type: process
status: validated
owner: Time de Operações
related:
  - docs/systems/crm.md
tags: [devolucao, crm]
last_updated: 2026-05-12
---
```

Regras:
- **Obrigatórios:** `title`, `type`, `status`, `last_updated`.
- `type`: `process | system | decision | knowledge | meeting | plan`.
- `status`: `draft | in_review | validated | deprecated`.
- `last_updated`: data no formato `AAAA-MM-DD`.

Esse bloco é invisível no texto renderizado, mas é o que torna tudo pesquisável.

---

## Camada 2 — Recuperação: AI Summaries e cross-links

**Objetivo:** fazer a IA ler um resumo barato primeiro, e só abrir o documento inteiro quando precisar. Um doc completo custa ~3.000 tokens; o resumo, ~150. Dez vezes menos.

### Passo 2.1 — Adicione um AI Summary no topo de cada doc
Logo abaixo do frontmatter, escreva:

```markdown
<!-- ai-summary
System: fluxo de devolução de pedido.
Flow: pedido -> análise -> aprovação -> reembolso.
Owner: time de operações.
Systems: CRM, automação, assinatura digital.
Status: validated.
-->
```

O resumo precisa ser autossuficiente: a IA decide, só pela leitura dele, se precisa abrir o resto.

### Passo 2.2 — Conecte os documentos
- Use o campo `related` no frontmatter para vínculos estruturais.
- Use links Markdown relativos no corpo para vínculos contextuais (ex.: `[CRM](../systems/crm.md)`).

> Por que isso importa: a janela de contexto é um orçamento. A performance não cai só perto do limite — ela degrada conforme o ruído acumula. Resumir e cachear é como você protege esse orçamento.

---

## Camada 3 — Confidence scoring (a IA sabe em que confiar)

**Objetivo:** dar a cada documento uma nota de 0 a 1 para a IA saber o que é fonte de verdade e o que é suspeito.

### Passo 3.1 — Adote esta rubrica
Pontue cada doc somando os pesos (somam 1.00):

| Critério | Peso |
|---|---|
| Freshness (atualidade) | 0.25 |
| Status | 0.20 |
| AI summary presente e válido | 0.15 |
| Cross-links | 0.15 |
| Completeness | 0.15 |
| Code match (coerência com a realidade) | 0.10 |

### Passo 3.2 — Interprete o score
- `>= 0.8` → confiável, fonte de verdade.
- `0.5 – 0.8` → usar com cautela.
- `< 0.5` → suspeito; um doc velho e isolado cai para ~0.3.

Um doc confirmado por várias fontes vira verdade. Sozinho, permanece hipótese.

---

## Camada 4 — Skills (procedimentos repetíveis)

**Objetivo:** transformar procedimentos que você repete em comandos que a IA executa igual, sempre.

### Passo 4.1 — Crie uma pasta `skills/`
Cada skill é um manual curto que a IA lê **antes** de agir. Ela carrega poucos tokens por padrão e só abre por inteiro quando a tarefa corresponde (divulgação progressiva).

### Passo 4.2 — Escreva sua primeira skill
Comece com uma só. Estrutura de cada skill:

```markdown
# /validate — Validar um documento

## Quando usar
Antes de marcar um doc como `validated`.

## Passos
1. Confira se o frontmatter tem os 4 campos obrigatórios.
2. Verifique se há bloco ai-summary válido.
3. Cheque se os links em `related` existem.
4. Calcule o score de confiança.

## Saída esperada
Lista de problemas (ou "OK") + score + recomendação.
```

Skills que valem a pena criar com o tempo: `/prime` (carrega contexto no início), `/add-info` (arquiva nova informação no doc certo), `/new-process`, `/search`, `/confidence`, `/diagram`, `/introspect`.

> Digitou uma vez. Roda igual. Sempre.

---

## Camada 5 — Análise de impacto

**Objetivo:** antes de mudar algo, a IA pergunta "quem depende disso?".

### Passo 5.1 — Defina o formato do relatório de impacto
Documente o formato que a IA deve produzir antes de qualquer mudança:

```
impact(target: "validateUser")
-> chamadores diretos: WILL BREAK
-> chamadores indiretos: LIKELY AFFECTED
-> fluxos atingidos
-> risco: HIGH | MEDIUM | LOW
```

Isso tira o medo de refatorar: zero bug surpresa. (A versão executável — grafo de código — vem depois; por enquanto é a convenção.)

---

## Camada 6 — Memória persistente

**Objetivo:** o conhecimento se acumula em vez de evaporar entre sessões.

### Passo 6.1 — Crie um `MEMORY.md`
Esse é o arquivo que a IA lê no começo de cada sessão. Estruture:

```markdown
# MEMORY.md

## Projetos ativos
- importador-csv: fase 3 pendente (runbook escrito)
- auditoria-seg: iteração 2 ok, rotação de chaves aprovada

## Decisões recentes
## Aprendizados
## Nunca esquecer
- nunca commitar segredos
- preferir migração incremental
```

### Passo 6.2 — Feche cada sessão entrevistando a si mesmo
Ao fim do trabalho, deixe a IA te perguntar:
- Isso aqui vale virar memória? O que foi não-óbvio?
- Registro essa escolha como decisão (ADR)?
- Algum processo mudou? Atualizo o doc e o confidence?

Assim o conhecimento acumula em vez de evaporar. A IA vira colega, não assistente.

---

## A rotina diária (depois que a base existe)

Não é projeto grande, é hábito. Em ordem:

1. **Comece a sessão** carregando o contexto (`MEMORY.md` + docs relevantes).
2. **Trabalhe** com a IA lendo os AI summaries primeiro, abrindo docs só quando preciso.
3. **Antes de mudar algo**, rode a análise de impacto.
4. **Ao terminar**, atualize `MEMORY.md`, registre decisões e suba o que mudou no git.

---

## Os 4 princípios para não errar

1. **Documentação é infraestrutura, não nota.** É camada operacional consumida por gente e por IA.
2. **Mapeie antes de automatizar.** Processo ruim automatizado vira processo ruim mais rápido.
3. **Automação é camada, não salto.** Cada camada destrava a próxima. Quem pula etapa fragiliza tudo.
4. **Modelo é commodity. Contexto é o diferencial.** Vocabulário, sistemas, regras e decisões históricas: é o que faz a IA virar colega em vez de estagiário.

---

## Comece amanhã (o mínimo absoluto)

Se você fizer só isto, já saiu na frente:

1. Crie uma pasta `docs/` em git. Texto puro, versionado.
2. Adicione frontmatter a cada doc. Metadados que a IA lê.
3. Escreva uma skill. Um procedimento que você repete vira `/comando`.
4. Mantenha um `MEMORY.md`. Onde você parou, o que aprendeu, o que não pode esquecer.

Camada por camada. Sua carreira é tão potente quanto o contexto que você dá pra IA.
