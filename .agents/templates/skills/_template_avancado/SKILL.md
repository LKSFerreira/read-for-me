---
name: english_name
alias: portuguese_alias
description: Description of the advanced skill using scripts, examples, or resource templates for task execution.
tags: [keyword-1, keyword-2, keyword-3]
triggers: ["phrase user would say in portuguese", "alternative trigger phrase", "direct command"]
---

# Purpose

Explain the high-level objective and operational context of this complex skill.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user interaction, generated code, comments, docstrings, commit messages, PR descriptions, and project documentation MUST remain strictly in Brazilian Portuguese (pt-BR).

# Skill Directory Structure

Always adhere to the skill directory layout:

- `scripts/`: Executable utility scripts (PowerShell, Bash, Node, Python).
- `examples/`: Reference implementations, sample code, or JSON payloads.
- `resources/`: Static templates (HTML, Markdown, configuration snippets).

# Execution Workflow

Follow this strict operational sequence:

1. **Environment and Setup:**
   - Execute the setup script located at `scripts/setup_environment.sh` (or `.ps1`).
   - If setup fails, abort execution and report the root cause to the user in `pt-BR`.

2. **Processing:**
   - Read the reference file in `examples/base_architecture.json` to understand the required schema.
   - Apply user-requested modifications following the example pattern faithfully.

3. **Generation and Finalization:**
   - Use the base template from `resources/template.md`.
   - Populate the template and save the artifact in the appropriate project location.

# Error Handling and Troubleshooting

- If step 1 fails with *Permission Denied*, execute `chmod +x` on the setup script.
- If a required dependency is missing, output a clear diagnostic message guiding the user in `pt-BR`.

# Rules and Constraints

- **Language:** All user dialogue, generated code, comments, and documentation MUST be in `pt-BR`.
- **Determinism:** Prefer modular utility scripts over ambiguous free-form text instructions.
- **Safety:** Do not overwrite existing user configurations without explicit comparison and confirmation.
