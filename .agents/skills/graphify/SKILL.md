---
name: graphify
alias: mapear_grafo
description: Installs and registers graphify (local project knowledge graph) across all harnesses and builds the initial visual and semantic code graph.
tags: [graphify, knowledge-graph, mapping, install, project, context, ast]
triggers: ["usa o graphify", "instala o graphify", "mapeia o projeto", "knowledge graph", "graphify", "gera o grafo", "mapear código"]
---

# Purpose

Make `graphify` available across all projects, regardless of the active agent harness (Claude Code, OpenAI Codex, Kilo Code, GitHub Copilot CLI, Google Antigravity). Graphify parses code, docs, images, and architecture into a searchable local knowledge graph (`graphify query`, `graphify path`, `graphify explain`), replacing manual regex searching.

Code parsing is performed locally via tree-sitter AST (zero LLM token cost, zero data leaves the machine).

This skill is idempotent and can be executed standalone (`/graphify`) or alongside `/init`.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user interaction, explanations, status reports, graph summaries, and code comments MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

- Shell with access to `winget` (Windows) or `curl` + `sh` (Unix) for `uv` bootstrap if missing.
- Permission to install `graphifyy` (via `uv tool` or `pipx`) and write project-scoped registration files (`--project`).

# Execution Workflow

## 1. Installation Guard (Lazy-Install)
Check if the CLI is already available:

```bash
graphify --version
```

- If present, skip directly to **Step 3**.
- If command fails (`command not found`), proceed to **Step 2**.
- *Note:* In PowerShell, execute `graphify .` (without a leading slash).

## 2. Install CLI (`graphifyy`)
The official PyPI package is **`graphifyy`** (with double-y); the resulting binary command is `graphify`.

### 2.1 Ensure `uv` Runtime
```bash
uv --version
```
If missing:
- **Windows:** `winget install astral-sh.uv`
- **Unix:** `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Run `uv tool update-shell` and refresh terminal PATH if necessary.

### 2.2 Install Package
```bash
uv tool install graphifyy
```
Fallback options if `uv` is unavailable:
```bash
pipx install graphifyy
# or
pip install graphifyy
```
Verify installation: `graphify --version`.

## 3. Register Across the 5 Platforms (Project-Scoped)
Execute registration with the `--project` flag to write commit-friendly config files into the workspace:

```bash
graphify claude install --project
graphify codex install --project
graphify kilo install --project
graphify copilot install --project
graphify antigravity install --project
```

- **Antigravity:** Writes to `.agents/rules` and `.agents/workflows`. If `--project` is unsupported by this specific subcommand, run without `--project` and report file locations.
- **Kilo:** Generates native command `.kilo/command/graphify.md`, plugin `.kilo/plugins/graphify.js`, and entries in `.kilo/kilo.json` / `.kilo.jsonc`.

## 4. Build Initial Knowledge Graph
```bash
graphify .
```
This generates the `graphify-out/` directory:
- `graphify-out/graph.html`: Interactive browser graph visualization with interactive search.
- `graphify-out/GRAPH_REPORT.md`: Conceptual highlights, key couplings, and suggested queries.
- `graphify-out/graph.json`: Full serialized graph for offline agent queries.

## 5. Version Control and Maintenance
Add the following line to `.gitignore` to avoid committing cost caches:
```text
graphify-out/cost.json
```
Suggest `git add` for registered platform configs and `graphify-out/`.

### Daily CLI Commands
```bash
graphify query "o que conecta auth ao banco?"
graphify path "UserService" "DatabasePool"
graphify explain "RateLimiter"
graphify hook install     # Auto-rebuilds graph on git commits (local AST)
graphify . --update       # Incremental graph re-extraction
```

# Rules and Constraints

- **Idempotency:** Always check `graphify --version` before attempting installation.
- **Project Scope:** Always use `--project` so configuration files belong to the repository.
- **Diff Safety:** Do not overwrite existing adapter files (`AGENTS.md`, `.agents/rules/`) without checking diffs.
- **Explicit Version Control:** Suggest `git add` only; follow the `commit` skill upon explicit user request.
