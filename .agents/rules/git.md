---
trigger: always_on
description: Version-control, commit, and pull-request rules.
---

# Git Rules

- Commit, push, and pull-request actions require an explicit user request.
- Keep commits atomic: each commit MUST represent one logical objective.
- Do not use `git add .`, `git add -A`, or `git commit -a` when changes are heterogeneous.
- Commit messages MUST follow `.agents/skills/commit/`.
- Pull-request text MUST follow `.agents/skills/pr/`.
- Unless the user explicitly requests another language, write commit messages and pull-request text in Brazilian Portuguese (pt-BR). English in this file is instruction-only.
- Never revert changes that may have been made by the user without clear approval.
