---
name: commit
alias: cria_commit
description: Strictly enforces repository versioning standards to create atomic, scoped commits with standardized emoji and type prefixes. Use whenever the user asks to create a commit, suggest commit messages, analyze git diff for committing, or run git add/git commit.
tags: [git, versioning, commit, stage, add, message]
triggers: ["faz o commit", "commitar", "versionar", "git add", "commit", "prepara o commit"]
---

# Purpose

Use this skill whenever requested to create a git commit, describe changes for versioning, or execute `git commit`. This skill guarantees two non-negotiable invariants:

1. Each commit represents a single, cohesive logical change group (atomicity).
2. The commit message follows the repository's immutable formatting standard.

Multiple files CAN and SHOULD belong to the same commit when they contribute to the exact same technical, functional, or documentation objective.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All commit messages, user dialogue, explanations, status updates, and code references MUST be written strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

1. **User Approval:** Require an explicit request or clear user approval before executing any commit.
2. **Change Analysis:** Inspect `git status`, `git diff --stat`, `git diff`, and `git diff --cached` to accurately map every modified and untracked file.
3. **Type and Emoji Classification:** Consult the Official Types Table below; strictly follow `resources/commit_template.md`.
4. **Staging and Execution:**
   - Execute `git add -- <file1> <file2>` ONLY for files in the current logical group.
   - NEVER execute broad staging commands such as `git add .`, `git add -A`, or `git commit -a`.
   - Execute `git commit -m "YOUR MESSAGE"` only after verifying the index with `git diff --cached --stat`.

# Execution Workflow

1. **Map Logical Groups of Changes:**
   - Separate pending modifications by objective, scope, and impact.
   - Distinct logical groups include, but are not limited to:
     - Documentation changes vs. application code;
     - Bug fixes vs. feature development vs. refactoring;
     - Infrastructure/CI configuration vs. business logic;
     - Independent files without a shared business intent.

2. **Determine Commit Cardinality (Single vs. Multiple Commits):**
   - Create a single commit ONLY when all changed files clearly serve the same functional, technical, or documentation objective.
   - Do NOT artificially split files that belong to the same flow simply because there are multiple files.
   - If multiple distinct logical groups exist, STOP automatic single-commit execution, present the proposed segmentation breakdown to the user, and create one commit per logical group.
   - A user prompt in the singular (e.g., "faça o commit") does NOT authorize grouping heterogeneous changes into one commit.

3. **Assign Type and Emoji per Logical Group:**
   - Classify each group using the exact emoji text string and type from the Official Types Table.
   - Never use vague types to conceal mixed scopes.

4. **Construct the Commit Message:**
   - Format: `:emoji_code: type: objective description in pt-BR referencing \`file\`, \`function\`, or \`route\``
   - Example: `:bug: fix: corrige validação do campo \`ean\` em \`components/ModalScannerBarras.tsx\``
   - Strictly follow `resources/commit_template.md`.

5. **Stage Current Group Only:**
   - Run `git add -- <files_in_group>`.
   - Validate staged changes with `git diff --cached --stat`.
   - If unrelated files were staged accidentally, unstage them before proceeding.

6. **Execute Commit:**
   - Run `git commit -m "MESSAGE"`.
   - Repeat the workflow for the next logical group until all intended changes are versioned.

# Atomicity Checklist

Before executing any commit, verify:

- [ ] A single, unambiguous technical objective is represented in this stage.
- [ ] The message accurately describes staged changes without combining unrelated topics.
- [ ] All staged files belong to the same workflow/feature.
- [ ] The commit can be reverted independently without breaking unrelated work.

If any item fails, segment the commit.

# Safety Gate / Blocking Rules

STOP and align with the user before committing when:

- Multiple logical groups exist and the division is ambiguous.
- The user requested a message without specifying whether to commit a subset or all changes.
- Staged and unstaged states conflict or alter the commit's technical meaning.
- Changes have mixed authorship or external origin.

# Official Types Table

Only the following exact combinations of emoji text code and type are permitted:

| Emoji Code | Type | Meaning / Scope |
|---|---|---|
| `:tada:` | `init` | Initial project setup or template initialization |
| `:books:` | `docs` | Documentation only (`README.md`, `.metadocs/`, docstrings) |
| `:bug:` | `fix` | Bug fixes |
| `:sparkles:` | `feat` | New features or capabilities |
| `:bricks:` | `ci` | CI/CD, Docker, scripts, build automation |
| `:recycle:` | `refactor` | Code restructuring without behavior changes |
| `:zap:` | `perf` | Performance improvements |
| `:boom:` | `breaking` | Breaking changes |
| `:lipstick:` | `feat` | UI/layout visual changes |
| `:test_tube:` | `test` | Automated or manual test additions/modifications |
| `:bulb:` | `docs` | Code comments or architectural explanations |
| `:card_file_box:` | `data` | Database migrations, schemas, seeds, data fixtures |
| `:broom:` | `cleanup` | Dead code removal, lint/formatting cleanup |
| `:wastebasket:` | `remove` | File or feature deletion |

# Rules and Constraints

- **Language:** Commit messages MUST always be in `pt-BR`.
- **Textual Emoji:** Use the exact text representation (e.g., `:bug:`), NEVER raw Unicode characters.
- **Reference Quotes:** File names, functions, routes, and variables in the message description MUST be enclosed in backticks (\`name\`).
- **Honest Descriptions:** Vague descriptions like "ajustes gerais", "correções", or "atualizações" are strictly forbidden.
