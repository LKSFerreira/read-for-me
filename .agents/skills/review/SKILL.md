---
name: review
alias: revisao_codigo
description: Reviews code modifications systematically with focus on bug detection, regression prevention, security vulnerabilities, architectural integrity, and test coverage.
tags: [review, code-review, quality, bugs, security, architecture]
triggers: ["revisa o código", "code review", "review", "analisa as mudanças", "revisão"]
---

# Purpose

Use this skill whenever reviewing code diffs, auditing Pull Requests, inspecting pending git modifications, or evaluating technical risk before merging or deployment.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All review findings, risk analyses, suggestions, dialogue, and code commentary MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

1. **Map and Inspect Diffs:**
   - Read `git status`, `git diff --stat`, and detailed unified diffs across changed files.
   - Understand the intended business and technical objective from issues, metadocs, or test suites.

2. **Systematic Audit Categories:**
   - **Correctness & Edge Cases:** Null checks, boundary conditions, async race conditions, resource leaks.
   - **Security:** Injection vectors, unvalidated inputs, credential exposure, missing authorization.
   - **Performance & Scalability:** Unindexed queries, N+1 patterns, unmemoized expensive calculations.
   - **Architecture & Clean Code:** Single Responsibility Principle, guard clauses, domain naming in pt-BR, absence of abbreviations.
   - **Test Coverage:** Missing test fixtures, unasserted branches.

3. **Format Review Findings:**
   - Structure feedback in `pt-BR` prioritized strictly by severity:
     - 🔴 **Crítico / Bug:** Blocks merging, introduces security flaw or runtime crash;
     - 🟡 **Alerta / Risco:** Potential performance or edge-case failure;
     - 🔵 **Sugestão:** Clean code or readability refinement;
     - ⚪ **Dúvida:** Clarifying technical question.
   - Cite exact `file:line` locations for each finding.
   - If the code is clean and has no defects, state that clearly and list any remaining test gaps.

# Rules and Constraints

- **No Premature Code Rewrites:** Do not modify or refactor the code during a review unless the user explicitly requests immediate fixes.
- **Objective Feedback:** Distinguish clearly between objective bugs/security risks and subjective stylistic preferences.
- **Language Invariant:** All review commentary MUST be written in `pt-BR`.
