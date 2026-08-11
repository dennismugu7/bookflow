-- Foundation schema: the tenancy spine (ADR-031).
--
-- Three tables — user_profiles, businesses, memberships. ADR-031 chose these over
-- the manual's "one placeholder domain table" so that Phase 3 can PROVE the
-- membership scoping rule end to end rather than assert it. A throwaway table
-- proves only that a migration runs.
--
-- Conventions are ADR-036: created_at/updated_at on every table with updated_at
-- maintained by trigger, hard delete only, every constraint named explicitly.
--
-- MIGRATIONS ARE DO-NOT-VIBE (CLAUDE.md §6). This file is reviewed line by line
-- by a human before it merges. It has not been at the time of writing.
--
-- NOT in this migration, deliberately:
--   * The salon handle table (ADR-021). Handles exist to serve the public
--     booking link, which needs the onboarding slice to populate it and the web
--     slice to consume it. Neither exists. Adding the table later is purely
--     additive — a new table and a foreign key — so there is no schema debt in
--     waiting, and building it now would mean building it against no consumer.
--     Stated here rather than silently omitted.
--   * Services, team members, bookings, opening hours. Later slices. ADR-031's
--     line is the tenancy spine and nothing past it.

-- ---------------------------------------------------------------------------
-- Shared: updated_at maintenance
-- ---------------------------------------------------------------------------
-- ADR-036. A trigger rather than application code, because an `updated_at` the
-- application sets is wrong the moment a row is touched by a migration, a seed,
-- a manual fix or a future worker — which is exactly when you are reading it to
-- find out what happened.
--
-- `search_path` is pinned empty and every reference schema-qualified: this
-- function runs with the privileges of whoever fires the trigger, and an
-- unpinned search_path on such a function is a privilege-escalation shape.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at to now() on UPDATE. Attached to every table (ADR-036).';

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
-- What GoTrue does not hold. ADR-027 makes auth.users the owner of identity,
-- credentials and auth email; this table owns the profile fields screen #20
-- renders and nothing else.
--
-- The primary key IS the auth.users id rather than a separate surrogate: the
-- relationship is one-to-one and mandatory, so a second identifier would be a
-- second thing to join on and keep in step. ADR-016 requires UUID primary keys
-- and auth.users.id is one.
--
-- NAME FIELDS: first_name and last_name are two columns, matching screen #20
-- (`DD-Bookflow-Native.md:1109-1110`). ADR-005's single-field rule is about
-- TEAM MEMBER names, which are content records; this is the authenticated
-- owner's own account. `CLAUDE.md` §9 currently restates ADR-005 as a blanket
-- "no second name field" — that phrasing is broader than the decision it cites,
-- and this migration is where the difference shows. Flagged for review.
create table public.user_profiles (
  id uuid not null,
  first_name text not null,
  last_name text not null,

  -- ADR-011: a storage object path in the private/public bucket, NOT a URL.
  -- Paths are content-hashed and immutable; URLs are derived at read time and
  -- would go stale in the row. Nullable: an owner need not have an avatar.
  avatar_path text,

  -- ADR-031. Recorded at sign-up because a backfill later cannot be performed
  -- honestly — there is no truthful value for a user who was never asked.
  -- The documents themselves do not exist yet (K70), so the version string
  -- currently points at nothing.
  terms_version text not null,
  terms_accepted_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_user_profiles primary key (id),

  -- Deleting the auth user deletes the profile. The profile is meaningless
  -- without the identity it describes (ADR-036: cascade where a child is
  -- meaningless without its parent).
  constraint fk_user_profiles_user
    foreign key (id) references auth.users (id) on delete cascade,

  -- Names are required and must not be whitespace. Length ceilings are
  -- defensive, not product rules.
  constraint ck_user_profiles_first_name_present
    check (length(btrim(first_name)) between 1 and 100),
  constraint ck_user_profiles_last_name_present
    check (length(btrim(last_name)) between 1 and 100),
  constraint ck_user_profiles_terms_version_present
    check (length(btrim(terms_version)) between 1 and 50),
  constraint ck_user_profiles_avatar_path_present
    check (avatar_path is null or length(btrim(avatar_path)) > 0)
);

comment on table public.user_profiles is
  'Profile fields for an authenticated owner. auth.users owns identity; this owns what it does not (ADR-031).';
comment on column public.user_profiles.avatar_path is
  'Storage object path, not a URL (ADR-011). URLs are derived at read time.';

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
-- ADR-003: one business per account, one seat. The cardinality is enforced by
-- memberships, not here — a business row does not know who owns it, which is
-- the point of modelling ownership as a join rather than an owner_id column.
create table public.businesses (
  id uuid not null default gen_random_uuid(),
  name text not null,

  -- ADR-004: private until explicitly published. Every public read filters on
  -- this. Defaults to false so a newly created business is never accidentally
  -- visible — the safe default is the one that leaks nothing.
  published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_businesses primary key (id),
  constraint ck_businesses_name_present
    check (length(btrim(name)) between 1 and 200)
);

comment on table public.businesses is
  'A salon or barbershop. Ownership is via memberships, never an owner_id column (ADR-003).';
comment on column public.businesses.published is
  'ADR-004. Every public read filters on this. Defaults false.';

create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
-- ADR-003's join, and the middle term of the `user → membership → business`
-- scoping rule that CLAUDE.md §5 makes a non-negotiable and that the repository
-- layer applies (ADR-013, forced by spike 001/C7: the service credential
-- bypasses RLS entirely).
create table public.memberships (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  business_id uuid not null,

  -- I9 leaves the role vocabulary open. 'owner' is the only value v1 issues, and
  -- the check constraint below is exactly where it widens: adding 'staff' is a
  -- one-line constraint change, and until someone makes it, an unexpected role
  -- is rejected by the database rather than interpreted by application code.
  role text not null default 'owner',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_memberships primary key (id),

  constraint fk_memberships_user
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint fk_memberships_business
    foreign key (business_id) references public.businesses (id) on delete cascade,

  -- A user joins a business at most once.
  constraint uq_memberships_user_business unique (user_id, business_id),

  constraint ck_memberships_role check (role in ('owner'))
);

comment on table public.memberships is
  'Joins a user to a business with a role (ADR-003). The middle term of the scoping rule.';
comment on constraint ck_memberships_role on public.memberships is
  'I9: role vocabulary is open. This constraint is where it widens.';

create trigger trg_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- The scoping rule resolves user → membership → business on every protected
-- read. uq_memberships_user_business already indexes (user_id, business_id);
-- this covers the reverse direction, listing a business's members.
create index ix_memberships_business on public.memberships (business_id);

-- ---------------------------------------------------------------------------
-- Row-level security: enabled, with NO policies
-- ---------------------------------------------------------------------------
-- ADR-013 and spike 001/C7. The API connects with a credential that bypasses
-- RLS entirely, so RLS is NOT the authorization mechanism — the repository layer
-- is, and CLAUDE.md §5 makes that a non-negotiable.
--
-- RLS is enabled anyway, with no permissive policies at all. With RLS on and no
-- policy, every non-bypassing role reads zero rows and writes nothing. So if
-- PostgREST is ever exposed, or an anon key leaks, or someone connects with the
-- authenticated role, the answer is an empty result rather than the table.
--
-- This is defence in depth in the strict sense: it protects nothing that the
-- repository layer protects correctly, and everything it protects incorrectly.
--
-- Deliberately NOT `force row level security`: the table owner is postgres, the
-- same role migrations and the API use, and forcing RLS on it would break the
-- API without adding protection against the threat this guards.
alter table public.user_profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.memberships enable row level security;

-- Belt and braces: revoke the grants Supabase issues to the client-facing roles
-- by default, so these tables are unreachable by two independent mechanisms
-- rather than one.
revoke all on public.user_profiles from anon, authenticated;
revoke all on public.businesses from anon, authenticated;
revoke all on public.memberships from anon, authenticated;
