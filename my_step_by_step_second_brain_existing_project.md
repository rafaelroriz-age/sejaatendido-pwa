# My step by step — build the Second Brain in MY existing project

Personal runbook for ME to execute, start to finish, applying the talk "How the market
practically forces you to build a second brain" (CEIA Open Day 2026, Thiago Peraro) to
**my specific case: a project that already exists, with context and documentation
already scattered around**.

The difference from the generic guide: I **do not start from scratch**. I discover what
is already documented, **consolidate and migrate** it into the new structure, and
reconcile what the old docs say with what the code actually does. Where there is a
conflict, **the code wins**.

Golden rule: **I do not skip a layer**. Each layer unlocks the next.

Time for the minimum base: one afternoon. After that it becomes a daily habit.

---

## Phase 0 — Setup (10 min)

- [ ] Open the existing project in VS Code.
- [ ] Confirm the project is under git: run `git status`. If not, `git init`.
- [ ] Create a dedicated branch: `git checkout -b second-brain`.
- [ ] Have an AI assistant with file access (Claude Code, Cursor, or equivalent) open
  at the project root.
- [ ] Open `prompt_segundo_cerebro_projeto_existente.md` (the prompt for the agent) — I
  use it in Phase 2.

> Why a separate branch: everything here is just text/markdown, reversible. The branch
> lets me review before merging into main.

---

## Phase 1 — Inventory of what ALREADY exists (30–45 min, me in charge)

Before generating anything, I need to know what I already have. This is "map before
automating".

- [ ] List where knowledge lives today. Skim and note paths:
  - `README.md` and other READMEs per subfolder
  - existing `docs/` folder (if any), `wiki/`, loose ADRs
  - Notion/Confluence export, if any
  - long code comments that explain business rules
- [ ] For each piece, classify the action in a quick table (a draft is fine):

| Knowledge item | Where it lives today (evidence) | Action |
|---|---|---|
| Returns flow | `README.md` §Returns | migrate |
| Gateway integration | comment in `payments.py` | create |
| Choice of async queue | memory/unrecorded | create (ADR) |
| Deploy doc | `docs/deploy.md` (outdated) | update |

- [ ] Mark the **5 to 10 highest-value items**. I do not try to cover everything at
  once.

> I do not need to write the documents now. Just map them. The agent does the heavy
> lifting in the next phase.

---

## Phase 2 — Run the agent to generate the textual base (the agent works)

Here I use the ready-made prompt. It already assumes an existing project and does the
consolidation.

- [ ] Open `prompt_segundo_cerebro_projeto_existente.md`.
- [ ] Fill in the fields between `«»` in the `<user_input>` section with my project's
  data (path, name, domain, where the current docs live, folders to ignore, language).
- [ ] Copy the whole ```` ```xml ```` block and paste it as the instruction for the
  agent.
- [ ] Let the agent run its procedure: discovery/reconciliation → structure → docs →
  frontmatter → ai-summaries → confidence → cross-links → `MEMORY.md` → index →
  roadmap.

What I should get back (covers Layers 1, 2, 3, and 6 of the talk):

```
docs/
├── README.md            # navigable index
├── CONVENTIONS.md       # conventions (frontmatter, ai-summary, confidence)
├── processes/
├── systems/
├── decisions/           # ADRs
├── knowledge/
├── meetings/
└── plans/
    ├── inventory.md      # item | evidence | action
    ├── divergences.md    # where the old doc conflicts with the code
    ├── open-questions.md
    └── second-brain-roadmap.md
MEMORY.md                # at the root
```

---

## Phase 3 — I review what the agent did (30 min, me in charge)

The agent does not merge on its own. I am the reviewer.

- [ ] Open `docs/plans/inventory.md` and check it caught my highest-value items.
- [ ] Open `docs/plans/divergences.md` and review each doc×code conflict. Decide case
  by case (remember: the code is the source of truth).
- [ ] Check `docs/plans/open-questions.md` and answer what I know.
- [ ] Open 3–4 documents and verify:
  - frontmatter with the 4 required fields (`title`, `type`, `status`, `last_updated`)
  - a short, self-sufficient `<!-- ai-summary -->` block
  - `confidence` consistent with the rubric (an old, isolated doc should be low, ~0.3)
  - `related` links that actually exist
- [ ] Adjust the `status` of docs I confirm are correct: bump to `validated`.
- [ ] `git add` + `git commit -m "docs: second brain base (layers 1-3, 6)"`.

> Done criterion for this phase: a new colleague (or an AI) understands how the project
> works by reading only `docs/README.md`, `MEMORY.md`, and the ai-summaries — without
> opening the code.

---

## Phase 4 — My first Skill (Layer 4) (20 min)

A procedure I repeat becomes a `/command`. I start with **just one**.

- [ ] Create the `skills/` folder at the root.
- [ ] Create `skills/validate.md` with this content (and adapt it to my project):

```markdown
# /validate — Validate a document

## When to use
Before marking a doc as `validated`.

## Steps
1. Check that the frontmatter has the 4 required fields.
2. Verify there is a valid ai-summary block.
3. Check that the links in `related` exist.
4. Compute the confidence using the rubric (Layer 3).

## Expected output
List of problems (or "OK") + score + recommendation.
```

- [ ] Test it: ask the agent "run /validate on docs/processes/<some-doc>.md".
- [ ] Commit.

> Next worthwhile skills, over time: `/prime` (loads context at the start of a
> session), `/add-info`, `/new-process`, `/search`, `/confidence`. One at a time.

---

## Phase 5 — Impact analysis as a convention (Layer 5) (10 min)

For now it is a textual convention (the executable version with a code graph comes in a
future phase, it is in the roadmap).

- [ ] Create `skills/impact.md` defining the format the AI must produce before any
  change:

```
impact(target: "<function/module>")
-> direct callers: WILL BREAK
-> indirect callers: LIKELY AFFECTED
-> flows affected
-> risk: HIGH | MEDIUM | LOW
```

- [ ] Agree with myself: before refactoring anything, I ask the agent for this report.

---

## Phase 6 — Close the session and lock in the habit (Layer 6)

- [ ] Open `MEMORY.md` and fill it with today's reality: active projects, recent
  decisions, learnings, "never forget" (e.g., never commit secrets).
- [ ] At the end of each session, let the AI interview me:
  - Is this worth becoming memory? What was non-obvious?
  - Do I record this choice as an ADR in `decisions/`?
  - Did any process change? Do I update the doc and the confidence?
- [ ] `git commit` and, once the branch is good, open a PR / merge into main.

---

## My daily routine (after the base exists)

1. **Start the session** by loading context (`MEMORY.md` + relevant docs, or `/prime`).
2. **Work** with the AI reading the ai-summaries first, opening docs only when needed.
3. **Before changing anything**, ask for the impact analysis.
4. **When done**, update `MEMORY.md`, record decisions, and push what changed to git.

---

## Quick checklist (the absolute minimum to get ahead)

- [ ] `second-brain` branch created.
- [ ] Inventory of what already exists done (item | evidence | action).
- [ ] Agent ran and generated `docs/` + `MEMORY.md` consolidating the old docs.
- [ ] I reviewed divergences and questions, bumped the `status` of correct docs.
- [ ] One skill (`/validate`) created and tested.
- [ ] `MEMORY.md` filled with the project's reality.

---

## The 4 principles so I don't get it wrong

1. **Documentation is infrastructure, not a note.** It is an operational layer,
   consumed by people and by AI.
2. **I map before automating.** A bad process automated becomes a bad process faster.
3. **Automation is a layer, not a jump.** Each layer unlocks the next. Skipping a step
   weakens everything.
4. **The model is a commodity. Context is the differentiator.** Vocabulary, systems,
   rules, and historical decisions: that is what makes the AI a colleague, not an
   intern.

> In my case (existing project), the biggest gain is in Phase 1 and Phase 3: I am not
> inventing documentation — I am **rescuing and reconciling** the knowledge that was
> already scattered, and turning it into something the AI operates on top of.
