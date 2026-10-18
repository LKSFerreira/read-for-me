---
name: init
alias: inicia_projeto
description: Generates the initial context, rules, metadocs, and structure for newly initialized projects or studies based on the detected tech stack.
tags: [setup, initialization, project, scaffold, bootstrap, stack]
triggers: ["inicia o projeto", "setup inicial", "configura o ambiente", "init", "inicializar"]
---

# Purpose

Standardize a new or uninitialized repository with rules, metadocs, adapters, and a `README.md` coherent with the detected technology stack.

> Optional follow-up: After initialization, the `graphify` skill can be triggered to install and register the local knowledge graph across all harnesses and build the initial visual graph.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user interaction, generated `README.md`, `ROADMAP.md`, `HISTORY.md`, explanations, and code comments MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

## 1. Detect Stack and Language
Detect the active technology stack following this priority order:
1. `package.json` → JavaScript/TypeScript
2. `pyproject.toml` or `requirements.txt` → Python
3. `go.mod` → Go
4. `Cargo.toml` → Rust
5. `composer.json` → PHP
6. `pom.xml` or `build.gradle` → Java
7. Predominant file extensions inside `src/` or workspace root.

## 2. Scaffold Minimal Repository Structure
If they do not already exist, create:
- `AGENTS.md` (universal adapter)
- `.agents/rules/workflow.md`
- `ROADMAP.md`
- `HISTORY.md`
- `.metadocs/implementation_plan/`
- `.metadocs/implemented/`
- `README.md` (in `pt-BR`)

## 3. Configure Project Language
- Replace `> LINGUAGEM_PROJETO: <linguagem>` in adapters with the detected stack name.
- Ensure `.agents/rules/<linguagem>.md` is referenced when matching rules exist.
- If the language does not yet have a dedicated rule file, record this as a backlog item in `ROADMAP.md`.

## 4. Finalize and Report
Present a summary in `pt-BR` detailing:
- Detected stack and configuration;
- Created or preserved files;
- Recommended next steps;
- Assessment of whether Docker setup is needed.

## 5. Optional Knowledge Graph Mapping (`graphify`)
- Offer the user the option to execute the `graphify` skill to install and register the knowledge graph across all 5 harnesses (`claude`, `codex`, `kilo`, `copilot`, `antigravity`) with `--project` scope and generate the initial code graph.
- Do NOT run graphify installation automatically without user confirmation.

# Rules and Constraints

- **No Destructive Overwrite:** Never overwrite existing documentation or user-authored notes without explicit comparison.
- **No Unrequested Installs:** Do not install heavy dependencies or run global setups during purely documentation/scaffold initialization.
- **Language Invariant:** All created documentation and user reports MUST be in `pt-BR`.
