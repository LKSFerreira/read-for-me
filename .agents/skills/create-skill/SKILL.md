---
name: create-skill
alias: autoria_skill
description: Creates or refactors reusable skills in `.agents/skills/` with clear scope, strict guardrails, and actionable instructions.
tags: [skill, automation, template, meta, creation, agent, scaffold]
triggers: ["cria uma skill", "nova skill", "melhora a skill", "skill", "salva esse procedimento"]
---

# Purpose

Use this skill whenever requested to create a new skill, persist a reusable procedure, refine existing skill instructions, or standardize workflows in `.agents/skills/`.

## Language Boundary (Mandatory)

Instructions in skill definition files are written in English for precise LLM instruction-following. However, all user interactions, explanations, reviews, code comments, and project deliverables MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

## 1. Gather Requirements
Ask the user (in `pt-BR`):
- What domain or specific task does this skill cover?
- What scenarios or triggers should activate it?
- Does it require executable utility scripts, templates (`resources/`), or examples?
- Is there reference documentation to include?

## 2. Scaffold Skill Directory
Create the folder structure at `.agents/skills/<english_name>/`:

```text
skills/<english_name>/
├── SKILL.md           ← Mandatory root instruction file
├── resources/         ← Static templates (Markdown, HTML, configs) if needed
├── scripts/           ← Deterministic utility scripts if needed
└── examples/          ← Reference implementations and payloads if needed
```

Reference templates:
- `.agents/templates/skills/_template_simples/` → For instructional, rule-based skills.
- `.agents/templates/skills/_template_avancado/` → For skills with scripts, templates, or multi-step execution pipelines.

## 3. Author `SKILL.md`

### Frontmatter Schema (Mandatory)
```yaml
---
name: english_name
alias: portugues_alias
description: A concise sentence in English detailing what the skill does and exact triggers.
tags: [keyword1, keyword2, keyword3]
triggers: ["frase que o usuário diria", "outra frase", "comando"]
---
```

### Frontmatter Validation:
- **`name`**: English identifier matching the directory name (`a-z`, `0-9`, `-`).
- **`alias`**: Portuguese name for bilingual discovery.
- **`description`**: English summary with clear activation conditions.
- **`tags`**: 3 to 8 keywords (Portuguese and English).
- **`triggers`**: Natural language phrases the user would speak in `pt-BR`.

### Content Structure:
```markdown
# Purpose
(High-level goal and operational trigger conditions)

## Language Boundary (Mandatory)
(Explicit clause mandating pt-BR for all user dialogue, generated code, comments, and outputs)

# Prerequisites
(Dependencies, configurations, or environment state required before execution)

# Execution Workflow
(Numbered, actionable, deterministic step-by-step instructions)

# Rules and Constraints
(Strict guardrails, safety gates, and anti-patterns)
```

## 4. Review with User
Present the draft to the user in `pt-BR` and verify:
- Does this cover all intended use cases?
- Are the instructions clear and guardrails sufficient?
- Does any section require more or less granularity?

## 5. Finalize and Register
- Ensure `SKILL.md` does not exceed 500 lines. Move large reference datasets or templates into `resources/`.
- Update adapter skill tables (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `AGENTS.md`) when applicable.

# Best Practices

- Make instructions **actionable and procedural**, not vague notes.
- Use utility scripts (`scripts/`) for deterministic formatting or validations to conserve agent token context.
- Keep instructions in **English** and all project-authored outputs/conversations in **pt-BR**.

# Rules and Constraints

- **Directory Name:** Lowercase English, kebab-case (no spaces or special characters).
- **File Placement:** `SKILL.md` must reside at the root of the skill folder.
- **No Empty Skills:** A skill must contain at minimum Purpose, Language Boundary, and Execution Workflow.
