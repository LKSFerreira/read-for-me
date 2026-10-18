---
trigger: model_decision
description: JS/TS conventions, project structure, naming, tests, and ESLint/Prettier formatting.
---

# JavaScript/TypeScript Rules

## Language Boundary

English in this file is instruction-only. Unless the user explicitly requests another language, produce responses, documentation, code comments, error messages, and user-facing text in Brazilian Portuguese (pt-BR). Use pt-BR for domain-specific JS/TS names, subject to the global code rules.

## 1: Runtime and Version
- **Node.js**: 20.x LTS (or later).
- **Package manager**: npm (default), yarn, or pnpm. Identify it by reading the lock file: `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.
- **TypeScript**: When present, assume `strict: true` in `tsconfig.json`. Prioritize static typing and avoid `any`.

## 2: Project Structure
Project structure may differ between frontend (React/Vue) and backend (Node/Express/Nest) applications. Adapt to the project context.

**Frontend example (React/Vite):**
```text
src/
├── components/     # Componentes visuais
├── services/       # Lógica de negócio e chamadas de API
├── hooks/          # Custom hooks
├── types/          # Tipagem global TypeScript
└── utils/          # Funções utilitárias
```

**Backend example (Node.js):**
```text
src/
├── controllers/    # Lida com requisições e respostas
├── services/       # Regras de negócio
├── routes/         # Definição de rotas da API
├── models/         # Esquemas de banco de dados
└── utils/          # Funções utilitárias
```

## 3: Code Conventions

### Naming (always pt-BR)
- **Variables and functions**: camelCase (`calcularTotal`, `usuarioAtual`).
- **React components**: PascalCase (`FormularioProduto`, `ListaCarrinho`).
- **Constants**: SCREAMING_SNAKE_CASE (`CHAVE_STORAGE`, `URL_API`).
- **Types/interfaces**: PascalCase **without prefixes** (`Produto`, `UsuarioProps`). *Avoid prefixes such as `IUsuario` or `TipoProduto`; use the entity name only.*

### Declarations and Asynchrony
- **Variables**: Use `const` by default. Use `let` only when reassignment is required. Never use `var`.
- **Asynchrony**: Prefer `async/await` with `try/catch` blocks over `.then().catch()` chains.
- **Functions**:
  - Prefer *arrow functions* for anonymous functions and callbacks.
  - Use a *function declaration* (`function nomeDaFuncao() {}`) for named exported functions, taking advantage of hoisting.

### Imports
- Use absolute imports when configured in `tsconfig.json` or Vite/Webpack.
- Group imports in this order: external libraries → internal components → utilities → types.

## 4: Tests
- **Framework**: Vitest (for Vite projects) or Jest.
- **Naming**: `<arquivo>.test.ts` or `<arquivo>.spec.ts`.
- **Coverage**: Focus on behavior and business rules; the desired minimum is 70%.

## 5: Formatting and Linting
- **Prettier**: Respect `.prettierrc` rules when the file exists in the project.
- **ESLint**: Follow `.eslintrc` or `eslint.config.js` rules.
- **General default (when no configuration exists):** Semicolons are required and strings use single quotes (`'`).

## 6: Development Environment
- **Dev container**: Docker Compose with Node.js Alpine.
- **Environment variables**: Use `.env.development` for development; never commit real `.env` files.
- **Hot reload**: Enable it through Vite/Webpack or `tsx watch`/`nodemon` in the backend.

## 7: Documentation
- Use **JSDoc** (`/** ... */`) to document public functions, parameters, and return values.
- Write comments in Portuguese to explain *why* complex logic exists, not *what* it does.
- Keep `README.md` updated with setup instructions in pt-BR unless the user requests another language.
