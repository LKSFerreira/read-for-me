---
name: env
alias: variaveis_ambiente
description: Guides the creation, validation, and maintenance of environment variables, secrets management, and safe `.env.example` templates.
tags: [env, variables, secrets, configuration, dotenv, environment, security]
triggers: ["variável de ambiente", "configura env", "secrets", ".env", "env"]
---

# Purpose

Use this skill whenever introducing, updating, auditing, or documenting environment variables, runtime configurations, API keys, or `.env.example` files.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All variable descriptions, user interaction, security warnings, and documentation MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

1. **Audit Environment Requirements:**
   - Map all required environment keys across backend, frontend, database, and third-party integrations.
   - For frontend stacks (e.g., Vite, Next.js), strictly separate public client variables (`VITE_`, `NEXT_PUBLIC_`) from private server secrets.

2. **Maintain `.env.example`:**
   - Update `.env.example` with dummy/placeholder values and descriptive Portuguese comments explaining format and usage.
   - Ensure required keys fail fast at startup with explicit error messages in `pt-BR` if missing.

3. **Security Audit:**
   - Verify that `.env`, `.env.local`, and other credential files are strictly listed in `.gitignore`.
   - Scan source code to ensure no hardcoded secrets, tokens, or passwords were committed.

# Rules and Constraints

- **Never Commit Secrets:** NEVER commit real API keys, credentials, or production values into git.
- **Fail Early:** Validate critical variables on bootstrap/initialization rather than allowing silent runtime crashes.
- **Clear Documentation:** Every variable added to `.env.example` must have an accompanying explanation of its purpose in `pt-BR`.
