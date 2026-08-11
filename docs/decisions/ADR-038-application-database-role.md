# ADR-038 — The application database role

**Status:** Accepted · **Resolves:** K73 · **Verified on staging, not assumed**

## Context

PR 1's migration created three tables owned by `postgres` — which is also the role migrations
run as, and, until this decision, the role the API would have connected as.

The review asked the obvious question. **An application connecting as the table owner carries
DDL over the entire schema.** Any SQL injection that reaches the database is then unbounded: it
can drop tables, not merely read rows. The blast radius of a bug is the whole schema rather than
the data the bug touched.

Tracked as **K73**, classified `F`, blocking PR 2 — because PR 2 is the first code to open a
database connection, and changing what that connection is afterwards means changing every
environment's secrets.

## Decision

**The API connects as a dedicated role, not as `postgres`.**

- `usage` on schema `public`
- `select, insert, update, delete` on the application tables
- **no DDL, no ownership**
- **the `BYPASSRLS` role attribute**

**Migrations continue to run as `postgres`, via the Supabase CLI** in the `migrate-staging` job
(ADR-034). The role that changes the schema and the role that uses it are different roles, which
is the entire point.

## Interaction with ADR-013, stated explicitly

This is the part that could have gone wrong quietly.

ADR-013 makes RLS **defence in depth only**, because the API's credential bypasses it — and
spike 001/C7 established that as the reason authorization lives in the repository layer. PR 1
then enabled RLS on all three tables **with no policies at all**, so any role subject to RLS
reads nothing.

**A non-owner role IS subject to RLS.** So moving the API off `postgres` would, by itself, have
left it reading zero rows from its own tables — the fix for one problem silently creating a
worse one.

**`BYPASSRLS` resolves it, and it is orthogonal to ownership.** The role bypasses RLS, so it
reads normally; it does not own the tables, so it has no DDL. RLS continues to block `anon` and
`authenticated` exactly as before. **ADR-013's model is unchanged** — RLS remains defence in
depth against a leaked anon key or an exposed PostgREST, and remains not the authorization
mechanism.

What is gained is narrow and real: **DDL is lost while nothing else changes.**

## Verification — evidence from the hosted project

This was checked **before this ADR claimed it works**, and on `bookflow-staging`
(`vvborjxraxdeflrllqwh`) rather than the local stack. `BYPASSRLS` normally requires a superuser
to grant, and **Supabase's `postgres` role is not a superuser** — so whether this design is even
available was an empirical question, not a design one. The same shape as A13.

**Role attributes on staging:**

| Role | `rolsuper` | `rolbypassrls` | `rolcreaterole` |
|---|---|---|---|
| `postgres` (connected as) | **false** | **true** | **true** |

`postgres` is not a superuser but *holds* `BYPASSRLS` and `CREATEROLE`. Since PostgreSQL 16, a
`CREATEROLE` role may confer attributes it possesses itself — which is why this works despite
the absence of superuser.

**What was executed, and what happened.** A probe role was created, granted, exercised, and
dropped; the rows and the leftover object it produced were removed afterwards.

| # | Attempt | Result |
|---|---|---|
| 1 | `create role … nologin` | **succeeded** |
| 2 | `alter role … bypassrls` | **succeeded** — `rolbypassrls = true`, `rolsuper = false` |
| 3 | `grant usage on schema public` + CRUD on all tables | **succeeded** |
| 4 | `create role … bypassrls` inline | **succeeded** |
| 5 | Read `public.businesses` as the probe role | **succeeded — 4 rows visible**, through RLS-with-no-policies |
| 6 | `insert into public.businesses` as the probe role | **succeeded** |
| 7 | `create table public.…` as the probe role | **refused** — `permission denied for schema public` |
| 8 | `alter table public.businesses add column` as the probe role | **refused** — `must be owner of table businesses` |
| 9 | Read `public.businesses` as `anon` | **refused** — `permission denied for table businesses` |

Rows 5 through 9 are the decision in one block: **the role reads and writes its data, cannot
create or alter anything, and `anon` is still shut out.**

**A wrinkle worth recording**, because it will confuse whoever tests this next. Under PostgreSQL
16+, a `CREATEROLE` role receives membership in roles it creates with **`SET FALSE`**, so
`postgres` could not `SET ROLE` to the probe role until granted explicitly
(`grant … to postgres with set true`). This does not affect production, where the API connects
as the role directly with its own credential — but it does affect anyone trying to reproduce
this from a `postgres` session.

## Consequences

- **A new credential exists per environment**, created at role-creation time and stored where
  ADR-023 requires — Actions secrets and Fly secrets, never on a development machine. The
  existing `STAGING_DATABASE_URL` is the **migration** credential and stays `postgres`; the API
  gets a second, separate connection string.
- **Grants are not automatic for future tables.** A table created by a later migration is owned
  by `postgres` and the application role has nothing on it until granted. Either every migration
  ends with an explicit grant, or `alter default privileges` is set once for `postgres` in
  `public`. **This is a migration-review checklist item either way**, and forgetting it produces
  a permission error at runtime rather than a silent failure — which is the better failure mode,
  but still one to expect.
- **`force row level security` becomes available as a real control later.** With the API no
  longer the owner, forcing RLS would no longer break it — though it would require the
  `BYPASSRLS` attribute to be dropped and real policies written, which is ADR-013's model
  changing and would need its own decision.
- **Role creation is not in a migration yet.** Roles are cluster-level, not schema-level, and
  Supabase manages some of them. Where the role is created — a migration, a one-off provisioning
  step, or the CLI — is PR 2's problem, and it must be reproducible rather than a thing done by
  hand once on staging.
- **Local and hosted must match**, or the API works locally as `postgres` and fails on staging
  as the restricted role. The local stack needs the same role, created the same way.

## Items resolved

**K73** (which database role the API connects as). It was `F`. Resolved **unconditionally** —
the fallback of permissive RLS policies scoped to the application role, which would have made
RLS load-bearing and amended ADR-013, is **not** needed and was not taken.

## Items created

None tracked. The grant-on-new-tables obligation and the role-provisioning mechanism are named
above and belong to PR 2.
