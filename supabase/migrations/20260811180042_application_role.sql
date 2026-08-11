-- The application database role (ADR-038).
--
-- The API connects as this role. It is NOT the owner of any table: it holds
-- CRUD on the application tables and nothing else, so a SQL injection costs
-- rows rather than the schema.
--
-- MIGRATIONS ARE DO-NOT-VIBE (CLAUDE.md §6). Reviewed line by line before it
-- merges. It has not been at the time of writing.
--
-- ── NO PASSWORD IN THIS FILE ────────────────────────────────────────────────
-- This file is committed. A password in it is a committed credential, which
-- CLAUDE.md §5 forbids outright and which this project has already had to
-- redact once. The role is created WITH LOGIN but with no password, which
-- means it exists and is inert: PostgreSQL refuses password authentication for
-- a role whose password is null.
--
-- Each environment sets its own, out of band:
--   local    — supabase/seed.sql, which is local-only and never runs in CI or
--              against a hosted project. A fixed, known value, in the same
--              class as the local anon key: a disposable container listening on
--              localhost. It is in .env.example so a fresh clone works.
--   staging  — set once by `alter role ... password ...` against the hosted
--              project, with a randomly generated value composed straight into
--              the STAGING_APP_DATABASE_URL Actions secret. Never printed,
--              never written to a file.
--   production — the same, when production exists. ADR-023: no hosted
--              credential is ever placed on a development machine.

-- ---------------------------------------------------------------------------
-- The role
-- ---------------------------------------------------------------------------
-- CREATE ROLE has no IF NOT EXISTS, so the guard is explicit. Migrations must
-- be re-runnable against a database that already has this role — staging will,
-- once its password is set, and re-running must not wipe it.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bookflow_api') then
    create role bookflow_api login;
  end if;
end
$$;

-- Attributes applied unconditionally so the role converges to this definition
-- however it was first created. All are idempotent.
--
-- BYPASSRLS is the load-bearing one and ADR-038 explains it: a non-owner role
-- IS subject to RLS, and the application tables have RLS enabled with no
-- policies, so without this the API would read zero rows from its own tables.
-- Verified on the hosted project (`vvborjxraxdeflrllqwh`) before being relied
-- on, because BYPASSRLS normally requires a superuser and Supabase's `postgres`
-- is not one — it holds BYPASSRLS and CREATEROLE, which is enough.
--
-- NOINHERIT: privileges must come from this role directly, not from anything it
-- is later made a member of.
--
-- NOSUPERUSER is deliberately absent. Naming it — even to turn it off — is
-- altering the superuser attribute, which PostgreSQL permits only to a
-- superuser, and neither the local nor the hosted `postgres` is one:
--   ERROR: permission denied to alter role (SQLSTATE 42501)
--   Only roles with the SUPERUSER attribute may alter roles with the
--   SUPERUSER attribute.
-- A role created by CREATE ROLE is NOSUPERUSER already, so nothing is lost.
-- Found by the local stack rejecting it, which is worth noting: the local
-- `postgres` is no more privileged than the hosted one.
alter role bookflow_api
  login
  nocreatedb
  nocreaterole
  noinherit
  bypassrls;

comment on role bookflow_api is
  'The API connects as this role (ADR-038). CRUD only, no DDL, no ownership. Password set per environment, never in a migration.';

-- ---------------------------------------------------------------------------
-- Membership: postgres may SET ROLE to bookflow_api
-- ---------------------------------------------------------------------------
-- WHY THIS EXISTS: so tests can run as the application role.
--
-- The integration harness connects as `postgres` — it must, because it needs to
-- create `auth.users` fixtures and switch roles — and then immediately
-- `set local role bookflow_api`, so that every test runs under exactly the
-- privileges the API has. Without this grant that switch is refused, and the
-- whole suite would silently run as `postgres`: a repository reading a table
-- nobody granted would pass CI and fail in production, which is most of what
-- this migration exists to prevent.
--
-- WHY IT MUST BE EXPLICIT: since PostgreSQL 16, a CREATEROLE role receives
-- membership in roles it creates with **SET FALSE** — the membership exists,
-- but `SET ROLE` is not part of it. `postgres` created this role and therefore
-- has admin over it, and still cannot assume it. The error is
-- `permission denied to set role "bookflow_api"`, which reads like a missing
-- grant rather than a defaulted option, and cost an afternoon on the hosted
-- project before it was understood.
--
-- WHAT IT CONFERS: nothing. `postgres` owns every table here and holds
-- BYPASSRLS itself, so it can already do everything `bookflow_api` can and a
-- great deal more. This grant adds no capability; it only removes an
-- inconvenience that would otherwise make the restriction untestable.
--
-- The reverse grant does NOT exist and must never be added: `bookflow_api` has
-- no membership in `postgres` and so no path back up. That asymmetry is the
-- security property.
grant bookflow_api to postgres with set true;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Schema usage only. NOT `create` — the probe on staging confirmed a role
-- without it fails CREATE TABLE with "permission denied for schema public",
-- which is the whole point of this migration.
grant usage on schema public to bookflow_api;

-- Table privileges, enumerated one table at a time.
--
-- ── Why explicit grants and NOT `alter default privileges` ──────────────────
-- Default privileges would grant automatically on every future table `postgres`
-- creates in `public`, so a grant could never be forgotten. It is rejected
-- anyway, for three reasons:
--
--   1. It is invisible. It is set once, in a migration nobody reads again, and
--      thereafter every new table silently becomes readable and writable by the
--      application. That is a denylist posture, and this project has taken the
--      opposite position everywhere it matters — ADR-020's public projection is
--      an allowlist precisely because "everything unless excluded" fails open.
--   2. It decides in advance for tables nobody has designed. Not every future
--      table should be application-writable; an audit or outbox-dead-letter
--      table might reasonably be insert-only, or postgres-only. Default
--      privileges answer that question before it is asked.
--   3. It is conditional on the creating role and schema, so a migration run any
--      other way silently does not get them — failing in the direction of a
--      missing grant anyway, but without anyone having decided.
--
-- The cost of explicit grants is that one can be forgotten. That cost is paid
-- by `role.integration.test.ts`, which enumerates every table in `public` and
-- asserts the four privileges on each — so a table added without a grant fails
-- a test rather than a request. The grant belongs in the same migration as the
-- table, where the reviewer is already looking.
grant select, insert, update, delete on public.user_profiles to bookflow_api;
grant select, insert, update, delete on public.businesses   to bookflow_api;
grant select, insert, update, delete on public.memberships  to bookflow_api;

-- ---------------------------------------------------------------------------
-- What is deliberately NOT granted
-- ---------------------------------------------------------------------------
-- * No privileges on `auth`. ADR-037 has the API create and delete users
--   through GoTrue's admin API over HTTP, never by writing auth tables
--   directly. If the API ever needs to read `auth.users` in SQL, that is a
--   decision to make explicitly, not a grant to have lying around.
-- * No privileges on `storage`, `vault`, `extensions` or any Supabase-internal
--   schema.
-- * No `create` on any schema, no ownership of any object, no DDL.
-- * No sequence grants — ADR-016 makes every primary key a UUID, so there are
--   no sequences to grant on. A future table with a sequence needs its own
--   grant, and the enumeration test will not catch that; sequences are not
--   tables.
--
-- * NO EXPLICIT GRANT ON `public.set_updated_at()`, AND THE DEPENDENCY IS
--   WEAKER THAN IT LOOKS.
--
--   ADR-036 maintains `updated_at` by trigger, and that function is SECURITY
--   INVOKER — it executes as whoever fired it, which for every write the API
--   makes is `bookflow_api`. The role holds EXECUTE on it only through
--   PostgreSQL's default grant of function execution to PUBLIC; there is no
--   explicit grant here and `pg_proc.proacl` is null.
--
--   The natural worry is that revoking EXECUTE from PUBLIC — a plausible
--   hardening step — would silently stop `updated_at` being maintained.
--   **It would not. This was tested, not assumed.** PostgreSQL checks EXECUTE
--   on a trigger function when the trigger is CREATED, not each time it fires.
--   With EXECUTE revoked from PUBLIC and `has_function_privilege` returning
--   false, an UPDATE as `bookflow_api` still had its `updated_at` overwritten
--   by the trigger.
--
--   What the privilege does gate is CREATING a trigger on this function, and
--   calling it directly. Migrations run as `postgres`, which owns the function
--   and always has EXECUTE, so a future migration attaching this trigger to a
--   new table is unaffected too.
--
--   Left on the default deliberately. An explicit grant would imply a
--   dependency that turns out not to exist, and would be one more line to keep
--   correct for no gain. `role.integration.test.ts`, in the "the updated_at
--   trigger fires for the application role" block, asserts the function is
--   still SECURITY INVOKER and that the trigger is effective under the
--   application role's own privileges — which is what would actually catch the
--   trigger being dropped, detached, or made owner-only.
