# Meu passo a passo — montar o Segundo Cérebro no MEU projeto existente

Runbook pessoal para EU executar, do começo ao fim, aplicando a palestra "Como o mercado praticamente te obriga a criar um segundo cérebro" (CEIA Open Day 2026, Thiago Peraro) ao **meu caso específico: um projeto que já existe, com contexto e documentação já espalhados**.

A diferença para o guia genérico: eu **não começo do zero**. Eu descubro o que já está documentado, **consolido e migro** para a nova estrutura, e reconcilio o que a doc antiga diz com o que o código realmente faz. Onde houver conflito, **o código vence**.

Regra de ouro: **não pulo camada**. Cada camada destrava a próxima.

Tempo para a base mínima: uma tarde. Depois vira hábito diário.

---

## Fase 0 — Preparação (10 min)

- [ ] Abrir o projeto existente no VS Code.
- [ ] Confirmar que o projeto está em git: rodar `git status`. Se não estiver, `git init`.
- [ ] Criar uma branch só para isso: `git checkout -b segundo-cerebro`.
- [ ] Ter um assistente de IA com acesso aos arquivos (Claude Code, Cursor ou equivalente) aberto na raiz do projeto.
- [ ] Abrir o arquivo `prompt_segundo_cerebro.md` (o prompt para o agente) — vou usá-lo na Fase 2.

> Por que branch separada: tudo aqui é só texto/markdown, reversível. A branch deixa eu revisar antes de juntar no main.

---

## Fase 1 — Inventário do que JÁ existe (30–45 min, eu no comando)

Antes de gerar qualquer coisa, eu preciso saber o que já tenho. Isso é o "mapeie antes de automatizar".

- [ ] Listar onde mora o conhecimento hoje. Passar o olho e anotar caminhos:
  - `README.md` e outros READMEs por subpasta
  - pasta `docs/` (se já existir), `wiki/`, ADRs soltos
  - export de Notion/Confluence, se houver
  - comentários longos no código que explicam regras de negócio
- [ ] Para cada peça, classificar a ação numa tabela rápida (pode ser num rascunho):

| Item de conhecimento | Onde está hoje (evidência) | Ação |
|---|---|---|
| Fluxo de devolução | `README.md` §Devoluções | migrar |
| Integração com gateway | comentário em `payments.py` | criar |
| Escolha de fila assíncrona | memória/sem registro | criar (ADR) |
| Doc de deploy | `docs/deploy.md` (desatualizado) | atualizar |

- [ ] Marcar os **5 a 10 itens de maior valor**. Não tento cobrir tudo de uma vez.

> Eu não preciso escrever os documentos agora. Só mapear. O agente faz o trabalho pesado na próxima fase.

---

## Fase 2 — Rodar o agente para gerar a base textual (o agente trabalha)

Aqui eu uso o prompt pronto. Ele já assume projeto existente e faz a consolidação.

- [ ] Abrir `prompt_segundo_cerebro.md`.
- [ ] Preencher os campos entre `«»` na seção `<entrada_do_usuario>` com os dados do meu projeto (caminho, nome, domínio, onde está a doc atual, pastas a ignorar, idioma).
- [ ] Copiar o bloco ```` ```xml ```` inteiro e colar como instrução para o agente.
- [ ] Deixar o agente executar o procedimento dele: descoberta/reconciliação → estrutura → docs → frontmatter → ai-summaries → confidence → cross-links → `MEMORY.md` → índice → roadmap.

O que eu devo receber de volta (cobre as Camadas 1, 2, 3 e 6 da palestra):

```
docs/
├── README.md            # índice navegável
├── CONVENTIONS.md       # convenções (frontmatter, ai-summary, confidence)
├── processes/
├── systems/
├── decisions/           # ADRs
├── knowledge/
├── meetings/
└── plans/
    ├── inventario.md     # item | evidência | ação
    ├── divergencias.md   # onde a doc antiga conflita com o código
    ├── duvidas-abertas.md
    └── segundo-cerebro-roadmap.md
MEMORY.md                # na raiz
```

---

## Fase 3 — Eu reviso o que o agente fez (30 min, eu no comando)

O agente não dá merge sozinho. Eu sou o revisor.

- [ ] Abrir `docs/plans/inventario.md` e conferir se ele pegou meus itens de maior valor.
- [ ] Abrir `docs/plans/divergencias.md` e revisar cada conflito doc×código. Decidir caso a caso (lembrando: o código é a fonte da verdade).
- [ ] Conferir `docs/plans/duvidas-abertas.md` e responder o que eu souber.
- [ ] Abrir 3–4 documentos e verificar:
  - frontmatter com os 4 obrigatórios (`title`, `type`, `status`, `last_updated`)
  - bloco `<!-- ai-summary -->` curto e autossuficiente
  - `confidence` coerente com a rubrica (doc velho e isolado deve estar baixo, ~0.3)
  - links em `related` que realmente existem
- [ ] Ajustar `status` dos docs que eu confirmo como corretos: subir para `validated`.
- [ ] `git add` + `git commit -m "docs: base do segundo cérebro (camadas 1-3, 6)"`.

> Critério de pronto desta fase: um colega novo (ou uma IA) entende como o projeto funciona lendo só `docs/README.md`, `MEMORY.md` e os ai-summaries — sem abrir o código.

---

## Fase 4 — Minha primeira Skill (Camada 4) (20 min)

Procedimento que eu repito vira `/comando`. Começo com **uma só**.

- [ ] Criar a pasta `skills/` na raiz.
- [ ] Criar `skills/validate.md` com este conteúdo (e adaptar ao meu projeto):

```markdown
# /validate — Validar um documento

## Quando usar
Antes de marcar um doc como `validated`.

## Passos
1. Conferir se o frontmatter tem os 4 campos obrigatórios.
2. Verificar se há bloco ai-summary válido.
3. Checar se os links em `related` existem.
4. Calcular o confidence pela rubrica (Camada 3).

## Saída esperada
Lista de problemas (ou "OK") + score + recomendação.
```

- [ ] Testar: pedir ao agente "rode /validate em docs/processes/<algum-doc>.md".
- [ ] Commitar.

> Próximas skills que valem a pena, com o tempo: `/prime` (carrega contexto no início da sessão), `/add-info`, `/new-process`, `/search`, `/confidence`. Uma de cada vez.

---

## Fase 5 — Análise de impacto como convenção (Camada 5) (10 min)

Por enquanto é convenção textual (a versão executável com grafo de código vem em fase futura, está no roadmap).

- [ ] Criar `skills/impact.md` definindo o formato que a IA deve produzir antes de qualquer mudança:

```
impact(target: "<função/módulo>")
-> chamadores diretos: WILL BREAK
-> chamadores indiretos: LIKELY AFFECTED
-> fluxos atingidos
-> risco: HIGH | MEDIUM | LOW
```

- [ ] Combinar comigo mesmo: antes de refatorar algo, peço esse relatório ao agente.

---

## Fase 6 — Fechar a sessão e firmar o hábito (Camada 6)

- [ ] Abrir `MEMORY.md` e preencher com a realidade de hoje: projetos ativos, decisões recentes, aprendizados, "nunca esquecer" (ex.: nunca commitar segredos).
- [ ] Ao fim de cada sessão, deixar a IA me entrevistar:
  - Isso aqui vale virar memória? O que foi não-óbvio?
  - Registro essa escolha como ADR em `decisions/`?
  - Algum processo mudou? Atualizo o doc e o confidence?
- [ ] `git commit` e, quando a branch estiver boa, abrir PR / merge no main.

---

## Minha rotina diária (depois que a base existe)

1. **Começo a sessão** carregando contexto (`MEMORY.md` + docs relevantes, ou `/prime`).
2. **Trabalho** com a IA lendo os ai-summaries primeiro, abrindo docs só quando preciso.
3. **Antes de mudar algo**, peço a análise de impacto.
4. **Ao terminar**, atualizo `MEMORY.md`, registro decisões e subo o que mudou no git.

---

## Checklist rápido (o mínimo absoluto para sair na frente)

- [ ] Branch `segundo-cerebro` criada.
- [ ] Inventário do que já existe feito (item | evidência | ação).
- [ ] Agente rodou e gerou `docs/` + `MEMORY.md` consolidando a doc antiga.
- [ ] Eu revisei divergências e dúvidas, subi `status` dos docs corretos.
- [ ] Uma skill (`/validate`) criada e testada.
- [ ] `MEMORY.md` preenchido com a realidade do projeto.

---

## Os 4 princípios para eu não errar

1. **Documentação é infraestrutura, não nota.** É camada operacional, consumida por gente e por IA.
2. **Mapeio antes de automatizar.** Processo ruim automatizado vira processo ruim mais rápido.
3. **Automação é camada, não salto.** Cada camada destrava a próxima. Pular etapa fragiliza tudo.
4. **Modelo é commodity. Contexto é o diferencial.** Vocabulário, sistemas, regras e decisões históricas: é o que faz a IA virar colega, não estagiário.

> No meu caso (projeto existente), o ganho maior está na Fase 1 e na Fase 3: eu não estou inventando documentação — estou **resgatando e reconciliando** o conhecimento que já estava espalhado, e transformando em algo que a IA opera em cima.
