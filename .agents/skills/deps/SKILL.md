---
name: deps
alias: dependencias
description: Manages packages, dependencies, runtimes, and lockfiles respecting project stack conventions and container boundaries.
tags: [dependencies, packages, npm, pip, uv, maven, install, update, lockfile]
triggers: ["instala dependência", "adiciona pacote", "atualiza deps", "deps", "dependências"]
---

# Purpose

Use this skill whenever adding, removing, upgrading, or troubleshooting dependencies and runtime packages across any supported programming language.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user communication, explanations, commit messages, and dependency change documentation MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

1. Identify the project package manager by inspecting lockfiles or manifests:
   - Node.js: Check for `package-lock.json` (`npm`), `pnpm-lock.yaml` (`pnpm`), or `yarn.lock` (`yarn`).
   - Python: Standard is `uv` (`pyproject.toml` / `uv.lock`); never fallback to manual pip unless explicitly configured.
   - Java: Maven (`pom.xml` / `./mvnw`) or Gradle (`build.gradle` / `./gradlew`).
   - Go: `go.mod` / `go.sum`.
   - Rust: `Cargo.toml` / `Cargo.lock`.
2. Check if Docker container execution is configured (via `dev.sh` or `.docker/compose.yaml`).

# Execution Workflow

1. **Verify Execution Context:**
   - If the project uses a Docker dev environment, run package manager commands inside the container via `bash exec.sh <command>` or within the active dev container to prevent host pollution.

2. **Execute Package Modifications:**
   - Use official CLI commands (e.g., `uv add <package>`, `npm install <package>`, `mvn dependency:resolve`).
   - NEVER manually edit lockfiles or manifest version pins unless resolving explicit merge conflicts.

3. **Validate and Sync:**
   - Ensure lockfiles are updated and committed alongside manifests.
   - Run a minimal build or test suite (`npm run build`, `uv run pytest`, `mvn test`) to ensure transitive dependencies are intact and cause no runtime collisions.

4. **Report Changes:**
   - Present a concise summary in `pt-BR` detailing added/updated packages, version changes, and validation status.

# Rules and Constraints

- **Host vs Container:** NEVER install packages directly on the host machine when the project has an active Docker dev container.
- **Lockfile Integrity:** Never edit lockfiles manually; always let package managers generate them deterministically.
- **Scope Control:** Do not perform broad unrequested version upgrades (`major` bump) without explicit user authorization.
