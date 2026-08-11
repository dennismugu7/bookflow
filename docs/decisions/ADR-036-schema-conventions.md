# ADR-036 — Schema conventions: timestamps, deletion, naming

**Status:** Accepted

## Context

The project manual's Phase 1 requires four things decided once, "so every future migration
doesn't relitigate them": ID strategy, timestamp columns, soft delete versus hard delete, and
naming conventions.

**ADR-016 settled identifiers.** The other three were never decided. Phase 3's first migration
is where they get answered — and if nobody names them, they get answered *by accident*, by
whatever the first table happens to do, and every table afterwards copies it.

## Decision

### 1. Timestamps

**Every table carries `created_at` and `updated_at`**, both `timestamptz not null default
now()`, both UTC per ADR-010.

**`updated_at` is maintained by a database trigger**, not by application code. One shared
trigger function, `public.set_updated_at()`, attached to every table.

### 2. Deletion

**Hard delete. No `deleted_at`, no soft-delete filtering, anywhere in v1.**

Referential behaviour is chosen per foreign key and stated in the migration — `cascade` where a
child is meaningless without its parent, `restrict` where losing it would destroy history.

Where a record must outlive its subject, the mechanism is **snapshotting**, not soft deletion:
ADR-006 already does this for bookings, which copy service name, duration and price so that
deleting a service cannot corrupt a booking's history.

### 3. Naming

- **`snake_case`** throughout. Tables **plural**, columns **singular**.
- Primary key column is **`id`**. Foreign key columns are **`<singular_referenced_table>_id`**.
- Booleans read as assertions — `published`, not `is_published`.
- Timestamps end in `_at`. Dates end in `_on`. Durations carry their unit — `duration_minutes`.
- Money carries its unit and currency-free name — `amount_minor`, per ADR-009.
- **Every constraint and index is named explicitly**, never left to PostgreSQL's default:

| Prefix | For |
|---|---|
| `pk_` | primary key |
| `fk_` | foreign key |
| `uq_` | unique constraint |
| `ck_` | check constraint |
| `ex_` | exclusion constraint |
| `ix_` | index |

Format: `<prefix><table>_<columns or purpose>`.

## Rationale

**On the trigger rather than application code.** An `updated_at` the application sets is wrong
the moment a row is changed by anything else — a migration, a manual fix, a future worker, a
seed script. It then lies in exactly the situation where you are reading it to find out what
happened. A trigger cannot be bypassed by forgetting, and it is the same three lines for every
table.

The cost is that `updated_at` is invisible in the query that writes it, so a reader of
`apps/api` will not see it being maintained. That is a real loss of locality, accepted because
the alternative loses correctness instead.

**On hard delete.** Soft delete is a decision to add a predicate to every query in the system
forever. Miss it once and you show deleted data; miss it in a `unique` index and you cannot
re-create a record with the same natural key after deleting one.

This project has a specific reason to refuse that: **the membership scoping rule** is already a
predicate every protected query must carry, applied in the repository layer because RLS cannot
be relied on (spike 001/C7). Adding a second mandatory predicate doubles the surface where
forgetting one is a data leak, on a Do-Not-Vibe surface. One invariant a reviewer must check
per query is tractable; two is where it starts being waved through.

The usual argument for soft delete — history and undo — is already answered better by
snapshotting for the case that matters, and K36 (what is deleted, retained or anonymised on
account deletion) remains open as a per-table decision rather than a blanket default nobody
chose.

**On naming every constraint.** PostgreSQL will name them, and its names are stable and
predictable, so this is not about avoiding chaos. It is that **constraint names are a public
interface here**. ADR-007's booking-conflict rule surfaces as SQLSTATE `23P01` naming a
constraint, and ADR-014 requires the API to map failures to a stable machine-readable `type`
slug. The API will branch on that constraint name. A name we chose is a name we can rely on and
read in a migration; `bookings_team_member_id_during_excl` is a name we inherited.

## Consequences

- **`set_updated_at()` is a shared object every table depends on.** It is created in the first
  migration and never changed casually; altering it changes behaviour on every table at once.
- **Attaching the trigger is a per-table step that can be forgotten.** Nothing enforces it. A
  table without it silently has a frozen `updated_at`. This belongs on the migration review
  checklist rather than in hope.
- **Deleting a business deletes its data.** With no soft delete there is no undo, so destructive
  operations need confirmation in the UI — which the designs already have for account deletion
  (screens #25–#27).
- **K36 gets sharper, not easier.** Account deletion has to say per table what happens, and
  "soft delete everything" is no longer available as an answer that defers the question.
- **These conventions are unenforced by tooling.** No linter checks them. They hold because
  migrations are Do-Not-Vibe and reviewed line by line, which is the same mechanism the rest of
  this project's schema rules rest on.

## Items resolved

None in the triage — the manual required these decided and the triage never tracked them, in
the same way ADR-022 settled tooling the triage never tracked. Recorded here so the gap is
closed explicitly rather than by whatever the first migration happened to do.

## Items created

None.
