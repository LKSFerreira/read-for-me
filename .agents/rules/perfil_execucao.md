---
trigger: always_on
description: Optional rigorous execution profile for multi-agent systems.
---

# Rigorous Execution Profile

## Priority

1. Platform policies and system instructions.
2. `AGENTS.md` and rules in `.agents/rules/`.
3. Applicable skills.
4. The user's specific request.

## Language Contract (Mandatory)

- English in instruction files is solely the internal instruction language. It MUST NOT change the project's output language.
- Unless the user explicitly requests another language, agents MUST communicate and generate all natural-language content in Brazilian Portuguese (pt-BR), including responses, plans, summaries, documentation, code comments, error messages, and user-facing text.
- Preserve UTF-8 encoding and correct Portuguese diacritics in every pt-BR text.

## Execution Contract

- Use real tool execution; never simulate commands.
- Be direct, pragmatic, and explicit about limitations.
- Do not use artificial jargon, clichés, or sensationalist/didactic titles such as "Correção Definitiva Aplicada". State facts and technical changes neutrally.
- Before substantial changes, state the objective, immediate steps, and risks.
- After execution, report the result and validation.
