-- Seed data for local development (ADR-026).
--
-- ADR-026 requires that a fresh clone reaches a working local state in ONE
-- command, and specifies one demo salon with services, team members, opening
-- hours and bookings in every status. Only the first part of that is writable
-- today: services, team members, opening hours and bookings have no tables yet.
-- This file seeds what exists — one owner, one business, one membership — and
-- grows with each slice that adds a table.
--
-- Applied automatically by `supabase db reset` and by `npm run seed`.
--
-- LOCAL ONLY. It writes to auth.users directly, which is acceptable against a
-- disposable local stack and is not acceptable anywhere else. Nothing in CI or
-- on staging runs this file: the migrate-staging job runs `db push`, which does
-- not apply seeds.
--
-- Idempotent by construction — every insert is `on conflict do nothing` against
-- a fixed id, so re-running it is a no-op rather than a duplicate-key error.

-- Fixed UUIDs, not generated: a test or a manual check can rely on them, and a
-- re-run updates the same rows rather than creating new ones.
--   owner    : 00000000-0000-4000-8000-000000000001
--   business : 00000000-0000-4000-8000-000000000002
--   membership: 00000000-0000-4000-8000-000000000003

-- ---------------------------------------------------------------------------
-- The application role's LOCAL password
-- ---------------------------------------------------------------------------
-- The migration creates `bookflow_api` with LOGIN and no password, because that
-- file is committed and a password in it would be a committed credential
-- (CLAUDE.md §5). The password is set per environment, out of band.
--
-- This is the local one, and it belongs here because seed.sql is the only file
-- that is local-only by construction: `supabase db reset` and `supabase start`
-- run it, and the migrate-staging job does not — `db push` does not apply
-- seeds. The value is fixed and published in .env.example, in the same class as
-- the local anon key: it authenticates to a disposable container listening on
-- localhost, and it is not a secret.
--
-- If this ever needs to stop being a fixed value, it stops being seed data too.
alter role bookflow_api with password 'local_dev_password';

-- ---------------------------------------------------------------------------
-- The owner's auth identity
-- ---------------------------------------------------------------------------
-- Normally GoTrue's job (ADR-027). Written directly here because seeding runs
-- against the database, not the auth API, and because a local stack has no
-- email to click. Password is 'password123' — bcrypt hashed below — and is a
-- local fixture, not a credential: it grants access to a disposable container
-- that listens on localhost only.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'owner@bookflow.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
)
on conflict (id) do nothing;

-- GoTrue expects an identities row alongside the user; without it, login by
-- email fails in a way that looks like a wrong password.
insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"sub":"00000000-0000-4000-8000-000000000001","email":"owner@bookflow.test","email_verified":true,"phone_verified":false}',
  'email',
  now(),
  now(),
  now()
)
on conflict (provider, provider_id) do nothing;

-- ---------------------------------------------------------------------------
-- The profile, business and membership
-- ---------------------------------------------------------------------------
insert into public.user_profiles (
  id, first_name, last_name, terms_version, terms_accepted_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Dennis',
  'Mugu',
  'seed-placeholder',
  now()
)
on conflict (id) do nothing;

-- Published, so that the public-read path has something to find once
-- ADR-020's projection exists. ADR-004's default is false; this row opts in
-- deliberately.
insert into public.businesses (id, name, published)
values (
  '00000000-0000-4000-8000-000000000002',
  'Demo Salon',
  true
)
on conflict (id) do nothing;

insert into public.memberships (id, user_id, business_id, role)
values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'owner'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Still owed to ADR-026, blocked on tables that do not exist
-- ---------------------------------------------------------------------------
-- Services, team members, opening hours, and bookings in every status
-- (Booked, Confirmed, Cancelled, expired — ADR-007). Each arrives with the
-- slice that creates its table. The bookings seed in particular must satisfy
-- ADR-007's exclusion constraint, so it cannot be careless about overlapping
-- times — which makes it a small ongoing test of the constraint itself.
