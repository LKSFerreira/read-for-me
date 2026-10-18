---
name: sync
alias: sincroniza_contexto
description: Synchronizes repository context, audits project status, and aligns roadmap and metadocs with current workspace state upon starting new chats or resuming work.
tags: [context, synchronization, audit, status, roadmap, onboarding]
triggers: ["novo chat", "sincroniza", "onde paramos", "contexto", "retomar", "status do projeto"]
---

# Purpose

Act as a Tech Lead to synchronize context, audit active project health, and reconcile documentation with the real state of the repository before beginning substantial tasks or after starting a new conversation.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All status reports, audit summaries, backlog overviews, and user dialogue MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

## 1. Mandatory Discovery Sequence
Read and inspect:
1. `AGENTS.md` (and active adapter)
2. `.agents/rules/language.md`
3. `.agents/rules/workflow.md`
4. `.agents/rules/code.md`
5. `ROADMAP.md` (if present)
6. `HISTORY.md` (if present)
7. `README.md`
8. Stack manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`).

## 2. Reconcile and Audit
- Cross-reference tasks listed in `ROADMAP.md` against actual repository code and `.metadocs/implemented/`.
- Identify completed features that lack history records, uncompleted tasks, and stale documentation.
- Check for discrepancies between `LINGUAGEM_PROJETO` and active stack files.
- Inspect `git status` for uncommitted or untracked changes.

## 3. Status Report
Present an executive summary in `pt-BR`:
- **Status do Roadmap:** Last completed milestone and current next objective.
- **Consistência Documental:** Confirmation of integrity or list of detected drift.
- **Prontidão Operacional:** Direct checklist of immediate actions ready to be executed.

# Rules and Constraints

- **Read-Only by Default:** Do not execute source-code modifications during synchronization unless the user explicitly requests an immediate fix.
- **No Hallucinated Progress:** Base status strictly on verified files, never assuming uncommitted or undocumented work.
- **Language Invariant:** All synchronization output MUST be in `pt-BR`.
