---
name: front
alias: frontend_js
description: Guides JavaScript/TypeScript frontend implementation with strict focus on UI architecture, accessibility, state management, and user experience.
tags: [frontend, react, vue, css, html, layout, component, ui, ux, accessibility]
triggers: ["cria componente", "frontend", "layout", "estilização", "interface", "ui"]
---

# Purpose

Use this skill whenever developing user interfaces, building React/Vue/Vite components, styling layouts, managing client state, handling accessibility (a11y), or implementing frontend interactions.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All UI text, placeholder copy, error messages, component comments, and user-facing explanations MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Execution Guidelines

1. **Design System and Component Consistency:**
   - Adhere strictly to existing styling tokens, Tailwind classes, CSS modules, or UI component libraries in the repository.
   - Reuse existing icons (e.g., Lucide, Heroicons) and design patterns rather than introducing ad-hoc implementations.

2. **State and User Experience:**
   - Handle all essential states explicitly: `loading`, `empty`, `error`, `success`, and `disabled`.
   - Ensure responsive layouts across mobile, tablet, and desktop viewports without broken text wrapping or overlapping containers.
   - Ensure interactive accessibility: semantic HTML tags (`<main>`, `<nav>`, `<button>`, `<dialog>`), keyboard navigation, and ARIA labels.

3. **Validation and Verification:**
   - Run available build, lint, and test scripts (`npm run build`, `npm test`, `npx eslint .`).
   - Validate responsive layouts and interactive state transitions.

# Rules and Constraints

- **No Gratuitous Libraries:** Do not install new UI/component libraries without clear user necessity and approval.
- **Scope Fidelity:** Do not build marketing landing pages when the user requested an operational application, internal tool, or dashboard workflow.
- **Language Invariant:** All rendered UI strings, button labels, toasts, modals, and error alerts MUST be in `pt-BR`.
