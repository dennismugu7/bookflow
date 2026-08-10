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
-- and it keeps generated types free of extension objects.
--
-- SEARCH PATH — UNVERIFIED BEYOND LOCAL. `extra_search_path` in
-- supabase/config.toml puts `extensions` on the path, but that is a LOCAL
-- setting for the local stack only. Whether `extensions` is on the search path
-- of the role that runs migrations against a hosted project is not something
-- this repository has checked, and spike 001/C1 does not settle it: that spike
-- built its constraint on a hosted project without recording the search path
-- in force at the time.
--
-- It matters. If `extensions` is not on the path when the Phase 3 exclusion
-- constraint is created, the failure is:
--
--   data type uuid has no default operator class for access method "gist"
--
-- which reads as a mistake in the column types rather than as a missing
-- operator class that is installed but unreachable — an hour lost looking at
-- the wrong thing. Tracked as A13 in docs/analysis/05-triage.md, classified S:
-- it is answered in the booking slice's Phase 0, which is where that migration
-- gets written, and the answer decides whether that migration must set
-- search_path explicitly or schema-qualify the operator class.
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
-- Recorded as an assertion rather than a comment, so the assumption is checked
-- rather than merely written down. Be precise about what it catches: a FRESH
-- migration run against a server that does not supply the function — a new
-- environment built on an unsupported version. It cannot catch a server
-- downgraded underneath a database that has already recorded this migration,
-- because a recorded migration does not run again.
--
-- That is still the case worth guarding. Staging and production are not yet
-- provisioned (docs/ENVIRONMENT.md §3), so every environment that will ever
-- matter is a fresh run of this file that has not happened yet:
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
