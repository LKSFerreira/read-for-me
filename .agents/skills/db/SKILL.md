---
name: db
alias: banco_dados
description: Plans and validates database changes, queries, migrations, and seeds with a strict focus on security, data integrity, and reversibility.
tags: [database, sql, migration, schema, query, postgres, seed]
triggers: ["cria migração", "altera banco", "database", "sql", "query", "schema"]
---

# Purpose

Use this skill whenever working on database modeling, writing or applying migrations, creating complex SQL queries, generating seed fixtures, or diagnosing database states.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user interaction, explanations, documentation, database entity comments, and query descriptions MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

1. Identify the target database engine (e.g., PostgreSQL, MySQL, SQLite) and migration framework (e.g., Prisma, Alembic, Flyway, Knex).
2. Inspect existing schema definitions, migrations history, and ORM models before proposing alterations.

# Execution Workflow

1. **Schema Discovery:**
   - Review active schema files, relations, indexes, and existing migration files.
   - Verify connection configurations in `.env.example` or dev containers without exposing secrets.

2. **Plan Reversible Migrations:**
   - Design migrations with explicit `up` and `down` rollback scripts whenever supported.
   - Maintain separation between:
     - Structural changes (DDL: tables, columns, constraints, indexes);
     - Data seeds and fixtures;
     - Application code / ORM entity updates.

3. **Validation and Execution:**
   - Execute dry-runs or migration commands within the isolated development container or test environment.
   - Verify index efficiency and query performance for non-trivial queries.

4. **Documentation:**
   - Document schema alterations and data model changes in `pt-BR` within project metadocs or pull requests.

# Rules and Constraints (Safety Gates)

- **Data Safety:** NEVER run destructive SQL commands (`DROP TABLE`, `TRUNCATE`, `ALTER TABLE ... DROP COLUMN`) on production or non-test databases without explicit user confirmation.
- **Transactions:** Always wrap manual data mutations in transactions (`BEGIN ... COMMIT / ROLLBACK`).
- **Secrets:** NEVER hardcode credentials, passwords, or connection strings in migration scripts or repository files.
