# ADR-022 — Development environment and toolchain

**Status:** Accepted

## Context

The handoff review of `CLAUDE.md`, `DEFINITION_OF_DONE.md` and `docs/BUILD_LOG.md` found that
those files name activities without naming tools. `DEFINITION_OF_DONE.md` makes "unit tests
pass", "migration applies cleanly" and "type-check exits zero" hard gates, while no test
runner, migration runner or toolchain version is decided anywhere. A session cannot run a
command it cannot name.

Spike 001 recorded the machine's actual state: Node 24.19.0, npm 11.17.0, Flutter 3.44.8
stable, Dart 3.12.2, git 2.55.0 — and **no Docker, no Supabase CLI, no psql**.

## Decision

**Docker Desktop with the WSL2 backend is required for development.** The Supabase CLI runs
the local stack. **"Local" is a real environment, not a shared remote one.**

**Node is pinned** via `.nvmrc` and `package.json` `engines` to the **24.x** line.

**Migrations are plain SQL files** in `supabase/migrations/`, created and applied with the
Supabase CLI. **No ORM migration DSL.**

**Database access from the API is Kysely**, with types generated from the live schema by
`kysely-codegen`. Typed queries, raw-SQL migrations, no ORM.

**Tests:** Vitest for the API, unit and integration. Integration tests run against the local
Supabase Postgres and **reset between runs**. Flutter uses `flutter test` and
`integration_test`.

**Lint and format:** ESLint 9 flat config plus Prettier for TypeScript; `dart format` and
`flutter analyze` for Dart. Type-check is `tsc --noEmit`.

## Consequences

- Raw SQL migrations are chosen because the schema needs `btree_gist`, an exclusion
  constraint, RLS policies and a view — an ORM migration abstraction fights all four, and
  ADR-007 with spike 001/C1 makes the constraint load-bearing rather than incidental.
  Migrations are Do-Not-Vibe per `CLAUDE.md` §6, which is easier to honour when the artifact
  under review is the SQL itself.
- Kysely gives typed queries without an ORM's opinions about schema ownership. The types come
  *from* the database rather than defining it, so the migration stays authoritative.
- A real local stack means integration tests hit real Postgres — including the exclusion
  constraint, which cannot be exercised against a mock.
- **Docker Desktop and the Supabase CLI are not currently installed.** Both are prerequisites
  for Phase 2 and must be installed before it can execute.
- Pinning Node to a line rather than a patch keeps CI and local aligned without churning on
  every release.

## Items resolved

None in the triage. This settles tooling, which the triage never tracked — it records design
gaps, not engineering choices. Recorded here so the gap is closed explicitly.

## Items created

None.
