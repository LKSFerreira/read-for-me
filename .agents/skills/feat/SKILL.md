---
name: feat
alias: fecha_feature
description: Finalizes a feature documentation lifecycle, promoting implementation plans from '.metadocs/implementation_plan/' to '.metadocs/implemented/' and synchronizing history and roadmaps.
tags: [feature, delivery, documentation, promotion, completion, release]
triggers: ["finaliza a feature", "feature pronta", "entrega", "fecha feature", "concluído"]
---

# Purpose

Use this skill whenever a feature or technical task is completed (triggered via `/feat` or phrases like "finaliza a feature"). It orchestrates the documentation promotion lifecycle, moving plans into finalized implementation records and updating project tracking files.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All documentation files (`.metadocs/`, `HISTORY.md`, `ROADMAP.md`), user dialogue, summaries, and code comments MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

1. Verify whether a corresponding plan exists in `.metadocs/implementation_plan/<feature_name>.md`.
2. Confirm the code implementation has been tested and verified without loose ends.

# Execution Workflow

Select the appropriate flow based on prior documentation state:

## Flow A: Promoting an Existing Implementation Plan
1. **Synchronize Details:** Update `.metadocs/implementation_plan/<feature_name>.md` converting future-tense plans to past-tense descriptions of actual implementations, architectural decisions, and verification results.
2. **Promote Artifact:** Move (rename) the file from `.metadocs/implementation_plan/<feature_name>.md` to `.metadocs/implemented/<feature_name>.md`.
3. **Update History and Roadmap:**
   - Add a chronological entry with relative markdown link to `HISTORY.md`.
   - Update `ROADMAP.md` marking the corresponding item as completed (`[x]`).

## Flow B: Ad-hoc Delivery Documentation (No prior plan)
1. **Create Record:** Create `.metadocs/implemented/<feature_name>.md` directly.
2. **Document Implementation:** Detail the context of the change, architectural adjustments made, and validation steps.
3. **Update History:** Add the entry into `HISTORY.md` linking relatively to `.metadocs/implemented/<feature_name>.md`.

# Rules and Constraints (Guardrails)

- **No Duplicate Artifacts:** NEVER leave duplicate copies in both `implementation_plan/` and `implemented/`. Moving/promoting is mandatory.
- **File Naming:** File names must use lowercase `snake_case` with at most 3 words (e.g., `autenticacao_jwt.md`).
- **Relative Links Only:** NEVER use absolute OS paths (such as `file:///` or `C:\`) in `HISTORY.md` or `ROADMAP.md`. Always use relative markdown links (e.g., `[.metadocs/implemented/auth.md](.metadocs/implemented/auth.md)`).
- **Language:** All written content inside `.metadocs/`, `HISTORY.md`, and `ROADMAP.md` must be in `pt-BR`.
