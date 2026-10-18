---
name: find
alias: busca_skills
description: Discovers and installs skills from the open ecosystem (skills.sh) when the agent requires external specialized capabilities.
tags: [skills, marketplace, search, install, extension, ecosystem, npx]
triggers: ["busca uma skill", "instala skill", "tem skill para isso", "find skill", "skills.sh", "procura uma skill"]
---

# Purpose

Use this skill whenever searching for, evaluating, or installing third-party agent skills from the open ecosystem ([skills.sh](https://skills.sh/)). Compatible across agent harnesses (Copilot CLI, Codex, Gemini, Antigravity, Claude Code).

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user interaction, search summaries, recommendations, and prompts MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

1. Node.js installed and available in PATH (for `npx`).
2. Internet connectivity.

# Execution Workflow

## 1. Identify Need
Map:
- The target technical domain (e.g., React performance, Postgres tuning, E2E testing).
- The specific task to automate.

## 2. Search Skills
Execute the CLI search:

```bash
npx skills find [search_query]
```

Examples:
- User asks "como otimizo meu React?" → `npx skills find react performance`
- User asks "ajuda com PR reviews" → `npx skills find pr review`
- User asks "gerar changelog" → `npx skills find changelog`

Filter by trusted organizations:
```bash
npx skills find [query] --owner vercel-labs
```

## 3. Evaluate Quality and Security
Before recommending any skill to the user, verify:
- **Installation count:** Prefer skills with 1,000+ installs. Treat <100 installs with extreme caution.
- **Source reputation:** Official/verified sources (`vercel-labs`, `anthropics`, `microsoft`) are strongly preferred.
- **GitHub stars:** Scrutinize repos with low star counts or unverified authors.

## 4. Present Options to User
Present recommended skills to the user in `pt-BR` with:
- Skill name and functionality summary;
- Source organization and install count;
- Installation command and skills.sh link.

## 5. Install Upon Explicit Approval
Once the user explicitly confirms installation:

```bash
npx skills add <owner/repo@skill> -g -y
```

- `-g`: Installs globally (user level).
- `-y`: Skips interactive confirmation prompts.

## 6. Maintenance Commands
```bash
npx skills check    # Check for skill updates
npx skills update   # Update all installed skills
```

# Fallback: When No Suitable Skill Exists
If no quality skill is found:
1. Inform the user in `pt-BR`.
2. Propose solving the problem directly using core agent capabilities.
3. Suggest creating a tailored in-repo skill using `/create-skill`.

# Rules and Constraints

- **Explicit User Consent:** NEVER install an external skill without explicit user approval.
- **Reputation Check:** Always audit installation counts and repository source before recommending.
- **Language:** All interaction and skill evaluation summaries MUST be in `pt-BR`.
