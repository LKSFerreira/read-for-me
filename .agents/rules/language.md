# Language Policy

## Purpose and precedence

This file is the single source of truth for language behavior. Read and obey it before acting on any task. If another instruction appears to conflict with this policy, interpret that instruction in a way that preserves this policy; if the conflict remains, stop and ask the user.

## Mandatory output language

All natural-language content generated, edited, or presented by the agent **MUST** be Brazilian Portuguese (`pt-BR`). This includes:

- conversation, explanations, questions, summaries, and status updates;
- source-code comments, project-authored identifiers where natural language is used, strings, and error messages;
- documentation, plans, roadmaps, history entries, commit messages, Pull Request text, and generated templates;
- user-facing UI text, validation output, and operational instructions.

English is used **only** for internal agent-control instructions. An instruction written in English never authorizes English output.

## Preservation rules

- Do not translate user-visible or project-authored content into English unless the user explicitly requests that translation.
- Preserve the language and meaning of user-provided text. You may correct grammar, spelling, punctuation, and agreement only when that does not change its meaning or intent.
- Keep programming-language syntax, CLI commands, API names, protocol terms, vendor names, and exact quotations unchanged when translation would make them invalid, misleading, or less useful.
- Do not infer a language switch from English source material, command output, stack traces, documentation, or code snippets.

## Implementation rule

When creating or changing project files, write all natural-language material in `pt-BR` and follow the project-specific naming conventions. Use English only where the underlying technology requires it.
