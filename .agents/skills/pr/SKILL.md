---
name: pr
alias: cria_pr
description: Generates clean, aesthetic, and structured Pull Request descriptions strictly adhering to the repository template and formatting standards.
tags: [git, pull-request, pr, review, merge, github, changelog]
triggers: ["abre o pr", "cria o pull request", "texto do pr", "pr", "pull request"]
---

# Purpose

Use this skill whenever requested to compose, format, or draft a Pull Request (PR) description. Technical rigor, clarity, and aesthetic formatting are essential. Never generate unformatted or generic PR descriptions.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All PR descriptions, summaries, technical details, validation instructions, and dialogue MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

1. Review commits included in the target branch or inspect recent `git log` and `git diff` to understand the full scope of changes.
2. Identify architectural impacts, resolved issues, and validation/testing commands.

# Execution Workflow

1. **Gather Context:** Map affected project areas (infrastructure, backend, frontend, database) and group modifications logically.
2. **Load Template:** Strictly use the official template in `resources/pr_template.md`.
3. **Populate Content:** Replace bracket placeholders `[ ]` with accurate technical descriptions in `pt-BR`, adhering strictly to the Link Formatting Guardrails below.
4. **Deliver Output:** Present the finalized PR text enclosed within a Markdown code block (````markdown ... ````).

# Critical Link Formatting Guardrails (NON-NEGOTIABLE)

Breaking link formatting rules invalidates the PR description:

1. **NO ABSOLUTE PATHS:** NEVER use `file:///`, `cci:`, or local operating system paths (e.g. `c:/Users/...`).
2. **NO NESTED/SMART LINKS:** Never wrap formatted markdown links with extra brackets (e.g. `[[file](link)]`).
3. **STANDARD RELATIVE LINKS ONLY:** When referencing files in the changes section, use ONLY clean relative markdown links:
   - ✅ Correct: `[app/controllers/api_controller.py](app/controllers/api_controller.py)`
   - ✅ Correct: `[tests/test_main.py](tests/test_main.py)`
   - ❌ Forbidden: `[[app/main.py](cci:7://...)]`
   - ❌ Forbidden: `[arquivo](file:///c:/Users/...)`

# Style and Aesthetic Rules

- **Language:** Strictly Brazilian Portuguese (`pt-BR`).
- **Visual Presentation:** Preserve template emojis, structured bullet points, and section dividers.
- **Categorization:** Group changes logically (e.g., Architecture Improvements, Security/Error Handling, Typings/Backend).
