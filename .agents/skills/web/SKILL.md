---
name: web
alias: busca_web
description: Guides real-time web research for official documentation, recent API changes, dependency versions, and volatile technical facts.
tags: [web, research, search, documentation, internet, update, online]
triggers: ["pesquisa na web", "busca isso", "procura na internet", "web search", "web"]
---

# Purpose

Use this skill whenever answering queries that require up-to-date documentation, release notes, external API specifications, pricing models, or volatile technical data not covered by training cutoff knowledge.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All search summaries, technical explanations, citations, and user interaction MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

1. **Formulate Precise Search Queries:**
   - Use direct, targeted technical keywords, official library names, and exact error codes or method signatures.
   - Target official domains where appropriate (e.g. `docs.python.org`, `developer.mozilla.org`, `react.dev`).

2. **Evaluate and Prioritize Sources:**
   - **Primary Sources:** Official documentation, official GitHub repositories, RFCs, and package registries (PyPI, npm, Maven).
   - **Secondary Sources:** Established engineering blogs, StackOverflow verified answers, release announcements.
   - Avoid unverified personal blogs or outdated forum posts for critical architectural decisions.

3. **Synthesize Findings:**
   - Summarize findings in `pt-BR` with direct markdown links to cited sources.
   - Clearly distinguish between verified empirical facts and agent inference.

# Rules and Constraints

- **Source Integrity:** Never present outdated or unverified workarounds as official best practices.
- **Link Citations:** Always include markdown links (`[Source Name](url)`) for references consulted.
- **Language Invariant:** All synthesis, analysis, and recommendations MUST be in `pt-BR`.
