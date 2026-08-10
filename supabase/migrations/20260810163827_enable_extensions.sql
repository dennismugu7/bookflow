-- Extensions only. No tables, no types, no policies — the domain schema is
-- Phase 3 work and belongs to the vertical slice that needs it.
--
-- Migrations are a Do-Not-Vibe surface (CLAUDE.md §6). This file is reviewed
-- line by line before it is accepted.

-- ---------------------------------------------------------------------------
-- btree_gist
-- ---------------------------------------------------------------------------
-- Required by ADR-007. The booking-conflict rule is enforced by a GiST
-- exclusion constraint over (team member, time range, occupying status). GiST
-- indexes a range natively but does NOT index the scalar equality operator on
-- uuid, which the team-member column needs; btree_gist supplies that operator
-- class, so the two can sit in one constraint.
--
-- Verified available on Supabase by spike 001/C1, which built the constraint
-- and observed an overlapping insert rejected with SQLSTATE 23P01.
--
-- Installed into `extensions` rather than `public`: Supabase's convention,
-- and it keeps generated types free of extension objects. `extensions` is
-- already on the search path (config.toml `extra_search_path`).
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- UUID generation — deliberately no extension
-- ---------------------------------------------------------------------------
-- ADR-016 makes every primary key a UUID. That needs no extension here:
-- `gen_random_uuid()` has been a core PostgreSQL function since 13, and
-- config.toml pins this stack to major version 17 — the same line as the
-- hosted project spike 001 ran against.
--
-- This migration therefore installs NO uuid extension. Nothing is installed
-- that nothing needs.
--
-- Note what that does and does not mean. Supabase's own database
-- initialisation installs pgcrypto and uuid-ossp into `extensions` before any
-- migration runs, so both are present in the resulting database regardless of
-- this file. We do not depend on either: `gen_random_uuid()` resolves to the
-- core pg_catalog function, and the assertion below checks for exactly that
-- one — not for whichever extension happens to be installed alongside it.
--
-- Recorded as an assertion rather than a comment, so that a future server
-- downgrade fails the migration instead of failing a later table definition:
do $$
begin
  if to_regprocedure('pg_catalog.gen_random_uuid()') is null then
    raise exception
      'gen_random_uuid() is unavailable on this server (version %). ADR-016 '
      'requires UUID primary keys; PostgreSQL 13+ supplies this in core. '
      'Either restore a supported server version or add an extension that '
      'provides it — and record the change in an ADR.',
      current_setting('server_version');
  end if;
end
$$;
