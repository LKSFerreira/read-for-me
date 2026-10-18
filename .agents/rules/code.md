---
trigger: always_on
---

## Code and Architecture Standards

### Language Boundary (Mandatory)

- English is used in this repository's agent instructions only. It MUST NOT change the language of project output.
- Unless the user explicitly requests another language, agents MUST produce all natural-language output in Brazilian Portuguese (pt-BR), including responses, plans, summaries, documentation, code comments, error messages, and user-facing text.
- Use Brazilian Portuguese for domain-specific code names. English is allowed only for established industry conventions (`models/`, `api/`, `utils`), conventional actions (`commit`, `push`, `get`, `set`), or technical terms whose Portuguese equivalent would be unclear or unnatural (for example, `endpoint` and `payload`).

1. **Clean Code and Clean Architecture:**
   - Keep functions small and limited to one responsibility (SRP).
   - Use _guard clauses_ to prevent deep nesting.
   - Optimize code for readability and easy maintenance.

2. **Naming:**
   - **No abbreviations:** Do not use one- or two-letter variable names (`p`, `u`, `l`, `evt`, `req`).
   - Use expressive, descriptive names everywhere, including lambda and arrow-function parameters (for example, `usuarios.map(usuario => ...)`, not `usuarios.map(u => ...)`).

3. **Encoding and Diacritics:**
   - **Required encoding:** UTF-8.
   - Preserve native Portuguese diacritics in documentation, comments, user-facing text, error messages, and every other pt-BR text.
   - **Never degrade** Portuguese words to unaccented forms (`acao`, `configuracao`, `nao`, `revisao`, and similar) when UTF-8 is normally supported.
   - A generic preference for ASCII applies only to strictly technical identifiers or structural fragments where it causes no loss of meaning.
   - When a file already uses correct diacritics, preserve that convention; do not normalize it to ASCII.
   - **Authorial fidelity:** Limit corrections to user-authored text to spelling, punctuation, and grammar. Do not change its meaning, intent, or introduce semantic inventions.

4. **Production and Maintainability:**
   - Final code MUST prioritize structural **performance, security, and readability**.
   - Do not write didactic comments that restate what a block does; use expressive method and variable names instead.
   - Write comments only to justify complex architectural decisions and business _trade-offs_—the reason a choice was made.
   - Keep control flow concise and remove unnecessary blocks whenever Clean Code principles allow it.

5. **Error Handling:**
   - Avoid silent failures; never swallow exceptions.
   - Write clear error messages that support debugging, in pt-BR unless the user requests another language.

6. **Organization and Documentation:**
   - Do not keep commented-out or dead code in a file. Remove code that is no longer used.
   - Language-specific documentation requirements (typing, docstrings, commands) MUST follow `/.agents/rules/<linguagem>.md`.
