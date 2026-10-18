---
name: tests
alias: testes
description: Plans, scaffolds, and executes automated or manual test suites, linters, coverage reports, and regression checks tailored to the project stack.
tags: [tests, validation, quality, coverage, unit, integration, e2e, pytest, jest, vitest]
triggers: ["roda os testes", "testa", "cria teste", "validação", "coverage", "tests"]
---

# Purpose

Use this skill whenever authoring, updating, or executing unit, integration, end-to-end tests, linting suites, typecheckers, or runtime validation workflows.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All test execution summaries, test docstrings, failure reports, and user dialogue MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Workflow

1. **Stack and Tooling Discovery:**
   - Inspect manifest scripts (`package.json`, `pyproject.toml`, `pom.xml`, `Makefile`, `Cargo.toml`).
   - Identify active testing frameworks (e.g. `pytest`, `vitest`, `jest`, `JUnit`, `go test`).

2. **Determine Testing Strategy:**
   - **Targeted Unit Tests:** For domain logic, validators, transformers, and algorithms.
   - **Integration Tests:** For database repositories, API endpoints, and service boundaries.
   - **UI / Frontend Validation:** Test critical user journeys, accessibility, and error boundaries.
   - **Infrastructure / Docker:** Validate compose configs and container health checks.

3. **Execute Real Test Commands:**
   - Execute tests using real tool runners:
     - Python: `uv run pytest`
     - Node: `npm test` / `npm run test:coverage`
     - Java: `mvn test` / `./gradlew test`
     - Go: `go test ./...`
     - Rust: `cargo test`
   - In containerized projects, execute test runners inside the container via `bash exec.sh <test_command>`.

4. **Analyze and Report Results:**
   - Summarize test pass/fail counts, execution duration, and code coverage in `pt-BR`.
   - If tests fail, report the exact failing test, failure assertion, and traceback.

# Rules and Constraints

- **Real Execution Only:** NEVER simulate, hallucinate, or mock test results in text without executing real commands.
- **Explicit Blockers:** If tests cannot run due to missing local runtimes or external database dependencies, explicitly report the blocker in `pt-BR`.
- **Maintain Coverage:** New feature code must be paired with corresponding unit or integration test cases.
