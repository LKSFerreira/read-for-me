---
name: diag
alias: diagnosticos
description: Investigates build, lint, runtime, test, and environment errors systematically before proposing targeted, minimal fixes.
tags: [debug, error, diagnosis, build, lint, runtime, stacktrace, troubleshoot]
triggers: ["deu erro", "não funciona", "debug", "investiga o erro", "diagnóstico", "falhou"]
---

# Purpose

Use this skill whenever investigating build failures, lint errors, test crashes, runtime exceptions, regressions, or unexpected system behaviors.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All diagnostic reports, root-cause analyses, explanations to the user, and code fixes MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

1. **Collect Context and Real Error Output:**
   - Capture the exact command executed, full stack trace, error code, and environment variables.
   - Inspect recently modified files via `git status` and `git diff`.

2. **Isolate Root Cause:**
   - Trace the exact line and function originating the failure.
   - Distinguish syntax/type errors, missing dependencies, broken invariants, and configuration drift.
   - Avoid speculating; verify hypotheses against real source files.

3. **Formulate Minimal Remediation:**
   - Determine the minimal cohesive change required to fix the defect without altering unrelated code.
   - Explain the root cause and proposed fix to the user in `pt-BR`.

4. **Apply and Verify Fix:**
   - Apply the targeted fix.
   - Re-run the exact command, test, or build that previously failed.
   - Verify that no secondary regressions were introduced.

# Rules and Constraints

- **Never Swallow Errors:** Do not "fix" errors by deleting assertions, removing tests, or introducing empty `catch` blocks.
- **Root Cause over Symptom:** Fix the actual flaw rather than merely patching outward symptoms.
- **External Blockers:** If the issue stems from missing third-party credentials, network outages, or hardware limits, explicitly inform the user in `pt-BR`.
