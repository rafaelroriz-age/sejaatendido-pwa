# Prompt — Construir a infraestrutura de conhecimento ("Segundo Cérebro") — Fase 1: somente documentos e texto

> Entregue o bloco abaixo (entre as linhas `=== INÍCIO DO PROMPT ===` e `=== FIM DO PROMPT ===`) para outro agente de codificação. Ele foi escrito para ser autocontido: o agente não precisa ter visto a palestra nem este arquivo de capa.

---

=== INÍCIO DO PROMPT ===

<role>
Você é um Arquiteto de Conhecimento e Engenheiro de Contexto. Sua especialidade é transformar conhecimento organizacional disperso em uma base versionada em texto puro, legível tanto por pessoas quanto por modelos de IA (knowledge-as-code). Você trata documentação como infraestrutura operacional, não como anotação. Você é meticuloso com convenções, consistência e exemplos.
</role>

<contexto>
Estou começando um projeto do zero e quero montar a fundação de um "Segundo Cérebro": uma camada de conhecimento que uma IA consegue ler, buscar, resumir, pontuar por confiança e operar em cima. A motivação importa para você calibrar as decisões: o modelo de linguagem é commodity; o diferencial é o contexto que entregamos a ele. Uma documentação enxuta, curada e com metadados legíveis por máquina supera documentação auto-gerada e inchada.

A arquitetura completa tem seis camadas. Esta tarefa cobre **apenas a fundação textual** das camadas que podem existir como documento puro:

1. Conhecimento — arquivos `.md` versionados em git, organizados por tipo.
2. Recuperação — busca e cross-links entre documentos (aqui: a convenção de links, não o motor de busca).
3. Contexto — "AI Summaries": um resumo curto no topo de cada doc que custa ~10x menos tokens que o documento inteiro.
4. Agente — "skills" (procedimentos repetíveis que a IA lê antes de agir) e memória de trabalho.
5. Ferramentas — grafo de conhecimento do código / análise de impacto (aqui: apenas a convenção documental que descreve como isso deve operar; nada executável).
6. Memória persistente — um `MEMORY.md` que sobrevive entre sessões.

Princípios que guiam tudo:
- Documentação é infraestrutura, não nota.
- Mapeie antes de automatizar.
- Automação é camada, não salto: cada camada destrava a próxima; não pule etapas.
- Modelo é commodity; contexto é o diferencial.
</contexto>

<objetivo>
Criar toda a infraestrutura de conhecimento em **texto puro** (arquivos Markdown e texto) que torna utilizável o Segundo Cérebro descrito acima, para um repositório novo. Ao final, um humano ou uma IA deve conseguir abrir o repositório e, lendo apenas os arquivos criados, entender a estrutura, as convenções e como contribuir, e já encontrar templates e exemplos prontos para uso.
</objetivo>

<escopo>
Faça (nesta fase):
- Criar a árvore de pastas e arquivos `.md`/`.txt` descrita em <entregaveis>.
- Escrever convenções, templates e exemplos reais preenchidos.
- Usar somente texto: Markdown, YAML em frontmatter e blocos de exemplo em fence de código.

Não faça (nesta fase):
- Não escreva código executável, scripts, ferramentas de CLI, servidores MCP, parsers, motores de busca, ações de CI ou configuração de build.
- Não instale dependências nem crie `package.json`, `requirements.txt` ou similares.
- Não invente fontes, métricas ou citações externas; quando precisar de um valor de exemplo, marque-o claramente como exemplo.

Se algo for ambíguo, escolha a opção mais simples e padrão, registre a decisão num ADR (ver camada de decisões) e siga em frente; não pare para perguntar a menos que uma escolha seja irreversível.
</escopo>

<entregaveis>
Crie exatamente esta estrutura na raiz do projeto. Use nomes de arquivo em minúsculas com hífen. Onde indico "(exemplo)", crie um arquivo realista e preenchido que sirva de modelo vivo.

```
.
├── README.md                      # porta de entrada: o que é, como navegar, como contribuir
├── AGENTS.md                      # como uma IA deve usar este repositório (formato de contexto)
├── MEMORY.md                      # memória persistente entre sessões (camada 6)
├── CONTRIBUTING.md                # regras de escrita: frontmatter, ai-summary, links, status
├── docs/
│   ├── processes/
│   │   ├── _template.md
│   │   └── processo-de-devolucao.md          # (exemplo)
│   ├── systems/
│   │   ├── _template.md
│   │   └── crm.md                            # (exemplo)
│   ├── decisions/                            # ADRs
│   │   ├── _template.md
│   │   ├── 0001-adotar-knowledge-as-code.md  # (exemplo)
│   │   └── 0002-formato-de-ai-summary.md     # (exemplo)
│   ├── knowledge/
│   │   ├── _template.md
│   │   └── glossario.md                      # (exemplo)
│   ├── meetings/
│   │   ├── _template.md
│   │   └── 2026-05-12-kickoff.md             # (exemplo)
│   └── plans/
│       ├── _template.md
│       └── roadmap.md                        # (exemplo, roadmap vivo)
├── conventions/
│   ├── frontmatter.md             # camada 1: esquema YAML obrigatório/opcional de cada doc
│   ├── ai-summaries.md            # camada 2: como escrever o bloco <!-- ai-summary -->
│   ├── confidence-scoring.md      # camada 3: rubrica de pontuação de confiança
│   ├── cross-linking.md           # camada 2: como referenciar e relacionar docs
│   └── impact-analysis.md         # camada 5: convenção documental de análise de impacto
└── skills/
    ├── README.md                  # o que é uma skill e como ela é lida/disparada
    ├── _template.md               # gabarito de skill
    ├── prime.md                   # carrega o contexto base no início da sessão
    ├── add-info.md                # captura e arquiva uma nova informação no doc certo
    ├── new-process.md             # cria um novo doc de processo a partir do template
    ├── search.md                  # protocolo de busca por confiança e relevância
    ├── validate.md                # valida frontmatter, links e ai-summary de um doc
    ├── confidence.md              # calcula/explica o score de confiança de um doc
    ├── diagram.md                 # gera um diagrama textual (mermaid) a partir de docs
    └── introspect.md              # fecha a sessão entrevistando o usuário e atualiza memória
```
</entregaveis>

<convencoes>
Siga estas convenções ao preencher os arquivos. Onde houver exemplo, replique exatamente o formato.

### Camada 1 — Frontmatter YAML (em todo doc dentro de `docs/`)
Todo documento começa com um bloco de frontmatter. Defina o esquema em `conventions/frontmatter.md` e use-o em todos os exemplos.
Campos obrigatórios: `title`, `type`, `status`, `last_updated`.
Campos recomendados: `related`, `tags`, `owner`.
- `type`: um de `process | system | decision | knowledge | meeting | plan`.
- `status`: um de `draft | in_review | validated | deprecated`.
- `last_updated`: data ISO `AAAA-MM-DD`.
- `related`: lista de caminhos relativos para outros docs.

### Camada 2 — AI Summary (no topo do corpo, logo após o frontmatter)
Logo abaixo do frontmatter, inclua um resumo enxuto que a IA lê primeiro e que custa muito menos tokens que o doc inteiro. Formato:

```markdown
<!-- ai-summary
System: <do que trata em uma linha>.
Flow: <etapa 1> -> <etapa 2> -> <etapa 3>.
Owner: <responsável>.
Systems: <sistemas/integrações citados>.
Status: <status>.
-->
```

Defina e explique esse formato em `conventions/ai-summaries.md`, incluindo a regra: o resumo deve ser autossuficiente o bastante para a IA decidir se precisa abrir o documento inteiro.

### Camada 2 — Cross-linking
Em `conventions/cross-linking.md`, defina como relacionar docs: use o campo `related` no frontmatter para vínculos estruturais e links Markdown relativos no corpo para vínculos contextuais. Links sempre apontam para caminhos dentro do repositório.

### Camada 3 — Confidence scoring (rubrica)
Em `conventions/confidence-scoring.md`, defina uma pontuação de 0 a 1 por documento, somando estes pesos (devem somar 1.00):
- Freshness (atualidade): 0.25
- Status: 0.20
- AI summary presente e válido: 0.15
- Cross-links: 0.15
- Completeness (completude): 0.15
- Code match (coerência com o que existe): 0.10

Explique a interpretação: um doc antigo e isolado cai para ~0.3 e deve ser marcado como suspeito; um doc confirmado por várias fontes vira fonte de verdade; um doc sozinho permanece hipótese. Inclua uma pequena tabela de faixas (ex.: `>= 0.8` confiável, `0.5–0.8` usar com cautela, `< 0.5` suspeito) — deixe claro que os limites são um ponto de partida ajustável.

### Camada 4 — Skills
Cada skill é um manual de procedimento curto que a IA lê antes de agir. Em `skills/README.md`, explique o princípio de "divulgação progressiva": a skill carrega poucos tokens por padrão e só é aberta por inteiro quando a tarefa corresponde a ela. Cada arquivo de skill deve conter, nesta ordem: nome/comando (ex.: `/validate`), quando usar, pré-condições, passos numerados que a IA executa, e o formato de saída esperado. Use o `skills/_template.md` como base de todas.

### Camada 5 — Impact analysis (apenas convenção textual)
Em `conventions/impact-analysis.md`, descreva o formato textual de um relatório de análise de impacto que a IA produziria antes de mudar algo (ex.: alvo, chamadores diretos, chamadores indiretos, fluxos atingidos, nível de risco). É só a convenção/documento — nada de implementação.

### Camada 6 — Memória persistente
`MEMORY.md` é a memória de trabalho entre sessões. Estruture com seções como `## Projetos ativos`, `## Decisões recentes`, `## Aprendizados` e `## Nunca esquecer`. A skill `introspect` deve descrever como atualizar este arquivo ao fim de uma sessão.
</convencoes>

<exemplos>
Use estes exemplos como padrão de qualidade e formato. Gere os arquivos de exemplo do <entregaveis> com este mesmo nível de detalhe.

<example>
Documento de processo (`docs/processes/processo-de-devolucao.md`):

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

<!-- ai-summary
System: fluxo de devolução de pedido.
Flow: pedido -> análise -> aprovação -> reembolso.
Owner: time de operações.
Systems: CRM, automação, assinatura digital.
Status: validated.
-->

## Objetivo
Descrever como uma devolução é processada do pedido ao reembolso.

## Passos
1. Cliente abre solicitação no CRM.
2. Operações analisa elegibilidade.
3. Aprovação registra a decisão.
4. Reembolso é emitido e confirmado.

## Sistemas envolvidos
Ver [CRM](../systems/crm.md).
```
</example>

<example>
ADR (`docs/decisions/0001-adotar-knowledge-as-code.md`):

```markdown
---
title: Adotar knowledge-as-code
type: decision
status: validated
last_updated: 2026-05-12
related:
  - conventions/frontmatter.md
tags: [adr, fundacao]
---

<!-- ai-summary
System: decisão de manter todo conhecimento em .md versionado em git.
Flow: contexto -> decisão -> consequências.
Status: validated.
-->

## Contexto
Conhecimento disperso não é legível por máquina nem versionável.

## Decisão
Manter todo conhecimento em Markdown com frontmatter, versionado em git.

## Consequências
Legível por pessoas e por IA; histórico rastreável; base para as camadas seguintes.
```
</example>

<example>
Skill (`skills/validate.md`):

```markdown
# /validate — Validar um documento

## Quando usar
Antes de marcar um doc como `validated` ou ao revisar contribuições.

## Pré-condições
O doc existe em `docs/` e tem frontmatter.

## Passos
1. Verifique se o frontmatter tem `title`, `type`, `status`, `last_updated`.
2. Confirme que `type` e `status` usam valores permitidos.
3. Verifique se há bloco `<!-- ai-summary -->` válido.
4. Cheque se os caminhos em `related` e nos links do corpo existem.
5. Calcule o score de confiança conforme `conventions/confidence-scoring.md`.

## Saída esperada
Lista de problemas encontrados (ou "OK"), seguida do score de confiança e da recomendação de status.
```
</example>

<example>
Trecho de `MEMORY.md`:

```markdown
# MEMORY.md

## Projetos ativos
- importador-csv: fase 3 pendente (runbook escrito)
- auditoria-seg: iteração 2 ok, rotação de chaves aprovada

## Nunca esquecer
- nunca commitar segredos: incidente registrado
- preferir migração incremental
```
</example>
</exemplos>

<formato_de_saida>
Trabalhe assim, nesta ordem:
1. Crie a árvore de pastas e todos os arquivos do <entregaveis>.
2. Preencha primeiro as convenções (`conventions/`), depois os templates (`_template.md`), depois os exemplos, depois os arquivos de raiz (`README.md`, `AGENTS.md`, `MEMORY.md`, `CONTRIBUTING.md`).
3. Todo doc em `docs/` deve ter frontmatter válido e bloco `ai-summary`.
4. O `README.md` deve explicar a estrutura, as seis camadas em uma frase cada, e como adicionar um novo documento.
5. Ao terminar, escreva um resumo curto: árvore final de arquivos criados e uma frase sobre o que cada pasta contém.

Escreva em português claro e direto. Prefira frases completas a listas fragmentadas, exceto em passos de procedimento (skills) e em esquemas, onde listas numeradas ajudam a ordem e a completude.
</formato_de_saida>

<verificacao_final>
Antes de declarar a tarefa concluída, confira cada item:
1. Nenhum arquivo de código executável, script ou configuração de build foi criado — apenas `.md`/`.txt`.
2. Todos os arquivos e pastas do <entregaveis> existem, com os nomes exatos.
3. Todo doc em `docs/` tem frontmatter com os 4 campos obrigatórios e um `ai-summary`.
4. Os pesos da rubrica em `confidence-scoring.md` somam 1.00.
5. Cada skill segue a estrutura: comando, quando usar, pré-condições, passos, saída esperada.
6. Todos os links relativos e caminhos em `related` apontam para arquivos que você de fato criou.
7. `README.md`, `AGENTS.md`, `CONTRIBUTING.md` e `MEMORY.md` estão preenchidos e coerentes entre si.
Corrija qualquer item que falhe antes de finalizar.
</verificacao_final>

=== FIM DO PROMPT ===
