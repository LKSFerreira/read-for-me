---
trigger: model_decision
description: Python rules for uv dependency management, modern typing, and RST docstrings.
---

# Python Rules

This file defines the Python-specific rules for this project.

## Language Boundary

English in this file is instruction-only. Unless the user explicitly requests another language, produce responses, documentation, code comments, error messages, and user-facing text in Brazilian Portuguese (pt-BR). Use pt-BR for domain-specific Python names, subject to the global code rules.

## 1: Dependency Management with `uv`
This project uses **uv** (Astral) as its standard package and environment manager.

**Execution Rules:**
- Use `uv` EXCLUSIVELY for packages, virtual environments, and execution.
- **NEVER** use `pip`, `virtualenv`, or `poetry` directly.
- Do **not** edit `pyproject.toml` manually to add dependencies.

**Standard Commands:**
```bash
# Adicionar lib de produção
uv add numpy

# Adicionar lib de desenvolvimento
uv add --dev pytest

# Rodar script
uv run main.py

# Rodar testes
uv run pytest
```

## 1.1: Dev Container Environment
In Docker, `uv` is already configured. The Dockerfile handles initial installation (`uv sync`).

**Commands in the Container:**
```bash
# Se precisar adicionar algo rápido (mas idealmente use uv add fora e rebuilde)
uv add pacote
```

## 2: Code and Typing Standard (Type Hints)
- **Modern typing (Python 3.10+)**: Use built-in types (`list`, `dict`, `tuple`) instead of importing them from `typing`.
- **Unions**: Use the `|` operator (for example, `str | None` instead of `Optional`).
- **Linting/formatting**: Follow PEP 8. Assume **Ruff** (also by Astral) for formatting and linting when suggesting style corrections.

## 3: Documentation Standard (Docstrings)
Agents MUST strictly follow the Sphinx-standard **ReStructuredText (RST)** format. Write docstrings in pt-BR unless the user explicitly requests another language.

**Required Structure:**
1. **Summary**: What the method/class does.
2. **Details (optional)**: Business rules and validations.
3. **Example**: A functional code block (`.. code-block:: python`).
4. **Notes (optional)**: Warnings (`.. note::`).
5. **Typing**: *Type hints* are required for arguments and return values.

**Canonical Template (Authoritative Reference):**
```python
from typing import Any

class GerenciadorUsuarios:
    """
    Gerencia operações de usuários com validações.

    Uma descrição detalhada e didática pode ser escrita aqui a fim de explicar o contexto,
    ou quaisquer outros pormenores que sejam necessários.

    **Exemplo:**

    .. code-block:: python

        gerenciador = GerenciadorUsuarios("MeuApp")
        usuario = gerenciador.criar_usuario("lucas@email.com", "Lucas", 25)
        print(usuario)  # Output: Lucas

    .. note::
       Esta classe não persiste dados. Use pickle ou JSON para salvar o estado.
    """

    def criar_usuario(
        self,
        email: str,
        nome: str,
        idade: int,
        tags: list | None = None
    ) -> dict:
        """
        Cria e valida um novo usuário no sistema.

        O email deve conter ``@`` e a idade estar entre 18 e 120 anos.

        **Exemplo:**

        .. code-block:: python

            usuario = gerenciador.criar_usuario(
                "joao@exemplo.com",
                "João Silva",
                30
            )
            print(usuario)  # Output: 1
        """
        # ... implementação ...
```
