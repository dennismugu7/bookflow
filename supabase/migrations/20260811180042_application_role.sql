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

-- Since PostgreSQL 16, a CREATEROLE role receives membership in roles it
-- creates with SET FALSE — so `postgres` cannot SET ROLE to bookflow_api
-- without this, and the integration tests that verify the grants could not run.
-- It confers nothing: `postgres` owns these tables and can already do anything
-- this role can.
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
