---
trigger: always_on
---

# Project Workflow

## Language Boundary (Mandatory)

- English in instruction files is solely the internal instruction language. It MUST NOT change the project's output language.
- Unless the user explicitly requests another language, agents MUST produce all natural-language output in Brazilian Portuguese (pt-BR), including responses, plans, summaries, documentation, code comments, error messages, and user-facing text.
- Preserve UTF-8 encoding and correct Portuguese diacritics in every pt-BR text.

## Principles

- Diagnose before modifying.
- Plan substantial changes prior to execution.
- Implement only the requested scope.
- Validate with tests, build, lint, or static checks whenever applicable.
- Preserve existing user-authored changes without unintended overwrites.

## Steps

1. **Discovery:** read relevant rules, metadocs, and affected files.
2. **Plan:** define technical approach, risks, and validation strategy.
3. **Execution:** apply small, cohesive, and testable changes.
4. **Verification:** run checks and validation commands compatible with the project stack.
5. **Delivery:** summarize what changed, how it was validated, and any remaining items.

## Safety Gate

Stop and align with the user when the task requires product decisions, unavailable credentials or external services, or unrequested destructive actions.
