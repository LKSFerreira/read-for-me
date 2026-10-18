---
name: plan
alias: plano_implementacao
description: Creates exhaustive, production-grade implementation plans in '.metadocs/implementation_plan/' detailing the 'How?' and 'Why?' pillars, engineered for deterministic execution by any LLM.
tags: [plan, architecture, specification, how-why, blueprint, execution, metadocs]
triggers: ["cria um plano de implementação", "plano de implementação", "planejar implementação", "fazer o plano", "novo plano", "plan", "/plan", "cria o plano"]
---

# Purpose

Use this skill whenever requested to create an implementation plan, architect a new feature, or structure technical delivery specifications. It ensures that every plan generated in `.metadocs/implementation_plan/` is formulated with extreme technical granularity, grounded on project coding standards, and structured around two mandatory pillars: **"Como?" (How)** and **"Por que?" (Why)**.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All generated implementation plans, user interactions, summaries, code comments, and documentation MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Core Philosophy: The LLM-Invariance Guarantee

A plan authored under this skill must guarantee **LLM-Invariance**:

> **Rule of Thumb:** The implementation plan must be so exhaustively detailed and unambiguous that **even a lower-tier or smaller LLM (e.g., 7B/8B models or older generations)** can follow the plan line by line and produce the exact same production-ready, clean, and bug-free architecture as a frontier model, without hallucinating, taking shortcuts, or inventing code structures.

### Prohibited Anti-Patterns in Plans
- ❌ Vague placeholders: `// implemente a lógica aqui`, `// adicione validações`, `/* restante do código */`.
- ❌ Generic instructions: "crie um listener que recebe a mensagem", "trate os erros adequadamente".
- ❌ Undefined contracts: omitting parameter types, return structures, or error exceptions.
- ❌ Missing rationale: writing code instructions without explaining *why* that architectural approach was chosen.

---

# The Two Mandatory Pillars (Os Dois Pilares Fundamentais)

Every module, component, interface, and algorithmic step in the plan MUST explicitly document two pillars:

## Pilar 1: Como? (Technical Implementation & Exact Mechanism)
Specifies the exact, reproducible execution steps:
- **File Location:** Absolute and relative paths (e.g., `src/tts/edge_tts_client.js`).
- **Interfaces & Types:** Complete signatures of classes, methods, functions, and parameters.
- **Data Formats:** Exact payload structure (JSON schemas, WebSocket frames, Storage keys, Message passing format).
- **Step-by-Step Algorithm:** Unambiguous logic, state machine transitions, event dispatching, and DOM interactions.
- **Error Handling & Edge Cases:** Fallback mechanisms, network timeouts, retries, boundary checks, and cleanup hooks.
- **Clean Code Standard:** Explicit variable naming without abbreviations (e.g., `indiceSentencaAtual`, not `idx`), guard clauses, and Single Responsibility Principle (SRP).

## Pilar 2: Por que? (Architectural Rationale & Trade-offs)
Justifies the architectural and engineering decisions:
- **Decision Rationale:** Why this API, pattern, or data structure was selected over available alternatives.
- **Performance Impact:** Implications for DOM reflow, memory buffers, thread blocking, audio latency, and battery consumption.
- **Security & Platform Constraints:** Manifest V3 restrictions (Service Worker lifecycle/hibernation, CSP, sandboxing).
- **Maintainability & Evolution:** Clean Architecture boundaries, decoupling, and zero breaking changes in third-party DOMs (e.g., SPAs).

---

# Skill Directory Layout

```text
.agents/skills/plan/
├── SKILL.md                                  ← This instruction file
├── resources/
│   └── template_plano_implementacao.md       ← Structural base template for plans
└── examples/
    └── exemplo_plano_detalhado.md            ← Reference gold standard plan
```

---

# Execution Workflow

Follow this deterministic sequence when activated:

## 1. Context Discovery & Ingestion
- Read `PRD.md` to identify product requirements and non-functional constraints.
- Read `.agents/rules/code.md`, `.agents/rules/workflow.md`, and language-specific rules (e.g., `.agents/rules/javascript.md`).
- Inspect existing workspace files (`list_dir`, `view_file`) to avoid conflicting contracts or duplicate modules.

## 2. Define Scope and File Naming
- Define a focused, cohesive feature scope.
- Name the plan file according to the repository standard:
  - Location: `.metadocs/implementation_plan/<feature_name>.md`
  - Constraint: Lowercase `snake_case`, at most 3 words (e.g., `motor_edge_tts.md`, `player_shadow_dom.md`, `extensao_base.md`).

## 3. Author the Implementation Plan
Use `resources/template_plano_implementacao.md` as the blueprint, strictly fulfilling all required sections:
1. **Cabeçalho & Metadados:** Título, data, escopo, regras ativas e objetivo direto.
2. **Arquitetura Geral & Decisões de Design (O Por que? Macro):** Visão sistêmica e justificativas de alto nível.
3. **Diagrama de Fluxo e Sequência:** Diagrama Mermaid detalhando o ciclo de vida e a troca de mensagens entre componentes.
4. **Estrutura de Arquivos e Módulos:** Mapeamento de cada arquivo a ser criado ou alterado.
5. **Especificação Detalhada por Módulo (Como? e Por que?):**
   - Assinaturas de classes/funções.
   - Esquemas de dados e mensagens.
   - Algoritmos passo a passo (zero ambiguidade).
   - Racional técnico e trade-offs.
6. **Casos de Borda, Falhas e Recuperação Resiliente:** Tratamento exato de desconexões, timeouts, entradas inválidas e concorrência.
7. **Critérios de Aceite e Roteiro de Validação:** Passos precisos de teste manual e automatizado com resultados esperados.

## 4. LLM-Invariance Quality Gate
Before saving, audit the plan against the checklist:
- [ ] Could an inferior LLM implement this without asking a single clarification question?
- [ ] Are all functions and classes typed with complete signatures?
- [ ] Does every single technical section contain both **Como?** and **Por que?**
- [ ] Are variable and function names descriptive and compliant with `.agents/rules/code.md` (no abbreviations like `req`, `cb`, `idx`)?
- [ ] Are native Portuguese diacritics and UTF-8 preserved across the document?
- [ ] Is the filename in `.metadocs/implementation_plan/` using snake_case with <= 3 words?

## 5. Persist and Report
- Write the plan into `.metadocs/implementation_plan/<feature_name>.md`.
- Present a clear, technical executive summary to the user in `pt-BR` with clickable links (`file:///...`).
- Remind the user that once implemented, the plan can be promoted using the `/feat` skill.

---

# Rules and Constraints

- **Language:** All written plans, summaries, and code comments MUST be in `pt-BR`.
- **No Hallucinated Omissions:** Never instruct the reader to "preencher depois". Every contract must be fully drafted.
- **Preservation of User Text:** Do not alter the intent or scope established in `PRD.md`.
- **Atomic and Cohesive:** Keep each plan focused on a solid, deliverable unit of work.
