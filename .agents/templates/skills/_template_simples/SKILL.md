---
name: english_name
alias: portuguese_alias
description: A clear one-sentence summary of what this skill does and when the agent should trigger it.
tags: [keyword-1, keyword-2, keyword-3]
triggers: ["phrase user would say in portuguese", "alternative trigger phrase", "direct command"]
---

# Purpose

State concisely what this skill accomplishes and the specific scenarios that trigger it.
_Example: "Use this skill whenever requested to build React UI components from scratch."_

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user interaction, generated code, comments, docstrings, commit messages, PR descriptions, and project documentation MUST remain strictly in Brazilian Portuguese (pt-BR).

# Prerequisites

- List required setup, environment states, or files that must exist before acting.
- _Example: TailwindCSS must already be configured in the workspace._

# Execution Workflow (Step-by-Step)

Specify the exact sequence of actions the agent MUST follow:

1. **Step 1:** Perform X and verify condition Y.
2. **Step 2:** Create or update file Z adhering to project conventions.
3. **Step 3:** Validate changes with command W.

# Rules and Constraints (Guardrails)

Strict, non-negotiable execution guardrails:

- **NEVER:** Perform destructive actions or broad unstaged operations without explicit user confirmation.
- **ALWAYS:** Write all user-facing output, comments, and documentation in Brazilian Portuguese (`pt-BR`).
- **PROHIBITED:** Introducing unauthorized third-party libraries or unverified assumptions.
