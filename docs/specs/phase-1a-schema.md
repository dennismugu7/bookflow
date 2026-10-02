# Phase 1a — Core schema, access rules and database CI

**Goal:** the data model every later phase builds on, with business rules and access rules enforced **by Postgres itself**, tested with pgTAP, and deployed automatically. No UI in this phase.

**Branch:** `feat/schema` → PR. Merge only on Dennis's `approved: merge PR #<n>`.

Phase 1b (slot engine, holds, booking function, rate limits) and 1c (SMS login hook) follow in separate specs.

## 0. Housekeeping (first commit)
- Commit the lead's uncommitted files on `main`'s working tree: `docs/portfolio/build-journal.md`, `docs/portfolio/evidence/2026-10-02-first-apk.jpg`, and this spec.
- Set the repo variable (not a secret): `gh variable set SUPABASE_PROJECT_ID --body eqhsgkzlqibxzghgqnfu`.
- GitHub already has secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`.

## 1. Schema (one migration per logical step is fine; names are binding)
Extensions: `btree_gist`. All tables in `public`, `id uuid primary key default gen_random_uuid()` unless stated, `created_at timestamptz not null default now()`, and `updated_at` + trigger where rows are edited. Money columns end in `_kes` (integer, `>= 0`).

| Table | Columns and constraints |
| --- | --- |
| `salons` | `slug text unique not null` check `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` and length 3–40; `name text not null` (1–80); `tagline`, `about`, `address text`; `latitude`, `longitude numeric`; `phone text` (E.164 check, nullable); `logo_path`, `banner_path text`; `timezone text not null default 'Africa/Nairobi'`; `is_published boolean not null default false` |
| `salon_members` | `salon_id` → salons (cascade), `user_id` → `auth.users` (cascade), `role` enum `member_role ('owner','staff')`, `staff_id uuid null` (the staff profile this login acts as); PK `(salon_id, user_id)`; composite FK `(salon_id, staff_id)` → `staff(salon_id, id)` |
| `staff` | `salon_id` → salons; `display_name text not null`; `title`, `bio`, `photo_path text`; `is_active boolean not null default true`; `sort_order int not null default 0`; `unique (salon_id, id)` |
| `services` | `salon_id` → salons; `name text not null`; `duration_min int not null` check `between 5 and 600 and duration_min % 5 = 0`; `price_kes int not null` check `>= 0`; `is_bookable boolean not null default true`; `sort_order int`; `unique (salon_id, id)` |
| `staff_services` | `salon_id`, `staff_id`, `service_id`; PK `(staff_id, service_id)`; composite FKs `(salon_id, staff_id)` → `staff(salon_id, id)` and `(salon_id, service_id)` → `services(salon_id, id)` so cross-salon links are impossible |
| `opening_hours` | `salon_id`; `weekday smallint` check 1–7 (ISO, 1 = Monday); `opens time`, `closes time` (`closes > opens`; `24:00` allowed) |
| `staff_hours` | `salon_id`, `staff_id` (composite FK); `weekday`, `starts`, `ends` as above. A staff member with no rows for a weekday follows the salon's opening hours |
| `time_off` | `salon_id`, `staff_id` (composite FK); `period tstzrange not null` (non-empty); `reason text` |
| `clients` | `salon_id`; `full_name text not null`; `phone text not null` check `phone ~ '^\+[1-9][0-9]{7,14}$'`; `user_id uuid null` → auth.users; `notes text`; `unique (salon_id, phone)`; `unique (salon_id, id)` |
| `bookings` | `salon_id`; `staff_id` (composite FK to staff); `client_id null` (composite FK to clients); `status` enum `booking_status ('held','confirmed','completed','cancelled','no_show','expired')`; `period tstzrange not null` check `not isempty(period) and lower_inc(period) and not upper_inc(period)`; `hold_expires_at timestamptz` with check `status <> 'held' or hold_expires_at is not null`; `total_kes int not null default 0`; `source text not null default 'owner'` check in (`'web'`,`'owner'`); `cancel_reason text`; **exclusion constraint** `exclude using gist (staff_id with =, period with &&) where (status in ('held','confirmed','completed','no_show'))` |
| `booking_services` | `booking_id` → bookings (cascade); `service_id` → services; snapshot `name`, `duration_min`, `price_kes`; `position smallint` |
| `booking_events` | `booking_id` → bookings; `actor_id uuid null`; `type text not null`; `data jsonb not null default '{}'`; append-only (no update/delete for any API role) |

Expired holds are **not** filtered with `now()` in the constraint (not allowed). Phase 1b's booking function will mark overlapping expired holds `expired` before inserting.

## 2. Access rules (RLS)
- Enable RLS on **every** table in `public`.
- Helper functions in a non-exposed schema `private` (`security definer`, `stable`, `set search_path = ''`): `private.is_salon_member(salon uuid)`, `private.is_salon_owner(salon uuid)`, `private.my_staff_id(salon uuid)`. Grant `usage` on `private` and `execute` to `anon, authenticated`.
- Policies:
  - `salons`: select if `is_published` or member; update if owner. No insert/delete policies (creation goes through `create_salon`).
  - `staff`, `opening_hours`, `staff_services`: select if the salon is published or member; insert/update/delete if owner.
  - `services`: select if (salon published and `is_bookable`) or member; write if owner.
  - `salon_members`: select if `user_id = auth.uid()` or member of that salon; insert/update/delete if owner.
  - `staff_hours`, `time_off`, `clients`, `booking_services`: select if member; write if owner.
  - `bookings`: select if member; insert if owner; update if owner, or staff where `staff_id = private.my_staff_id(salon_id)`. No delete.
  - `booking_events`: select if member. No insert/update/delete policies (written later by security-definer functions).
- Function `public.create_salon(p_name text, p_slug text) returns uuid`, `security definer`, `set search_path = ''`: inserts the salon (unpublished) and an `owner` membership for `auth.uid()`; raises if `auth.uid()` is null. `revoke execute ... from public, anon`; `grant execute ... to authenticated`.

## 3. Types, seed, CI and deploy
- Generate types to `packages/shared/src/database.types.ts` (`supabase gen types typescript --local`), export them from `@bookflow/shared`.
- `supabase/seed.sql`: a demo salon `demo-salon` (published) with 3 staff, 5 services, opening hours Mon–Sun 10:00–20:00, and fake clients in the `+2547000000xx` range. Local only.
- **CI job `db`** in `ci.yml`, only when `supabase/**` or `packages/shared/src/database.types.ts` change (use a paths filter step, so the job still reports success when skipped): `supabase start` (only the services needed: db), `supabase db reset`, `supabase test db`, then regenerate types and fail if they differ from the committed file. Add `db` to the required checks after it has passed once (tell the lead; Dennis or Claude Code updates branch protection).
- **Deploy workflow** `.github/workflows/db-deploy.yml`: on push to `main` touching `supabase/migrations/**`: `supabase link --project-ref ${{ vars.SUPABASE_PROJECT_ID }}` then `supabase db push`, using `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. `concurrency` without cancel (never cancel a migration mid-way). Also `workflow_dispatch`.
- Local: if Docker isn't available on the laptop, rely on CI for database tests and say so in the report.

## 4. Acceptance tests (lead-owned — copy verbatim into `supabase/tests/acceptance/`)
If a test itself looks wrong (syntax, a wrong assumption about Supabase), **stop and report** — the lead fixes it.

### `01_schema.sql`
```sql
begin;
select plan(14);

select has_extension('btree_gist', 'btree_gist is installed');

select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every public table has row-level security enabled'
);

select has_table('public', t::name, 'table ' || t || ' exists')
  from unnest(array[
    'salons','salon_members','staff','services','staff_services','opening_hours',
    'staff_hours','time_off','clients','bookings','booking_services','booking_events'
  ]) as t;

select * from finish();
rollback;
```

### `02_double_booking.sql`
```sql
begin;
select plan(8);

insert into public.salons (id, slug, name)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, 'a first booking is accepted');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 09:30+03', '2026-11-10 10:30+03'))
$$, '23P01', null, 'an overlapping booking for the same staff member is rejected');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 10:00+03', '2026-11-10 11:00+03'))
$$, 'a back-to-back booking is allowed');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'confirmed',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, 'a different staff member can take the same time');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'cancelled',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, 'a cancelled booking never blocks the time');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period, hold_expires_at)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
          tstzrange('2026-11-10 09:15+03', '2026-11-10 09:45+03'), '2026-11-10 08:00+03')
$$, '23P01', null, 'a hold cannot overlap a confirmed booking');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
          tstzrange('2026-11-11 09:00+03', '2026-11-11 10:00+03'))
$$, '23514', null, 'a hold must have an expiry time');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-12 09:00+03', '2026-11-12 09:00+03'))
$$, '23514', null, 'an empty time range is rejected');

select * from finish();
rollback;
```

### `03_integrity.sql`
```sql
begin;
select plan(9);

insert into public.salons (id, slug, name) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A'),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Braids', 60, 2500),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Trim', 15, 1000);

select throws_ok($$
  insert into public.staff_services (salon_id, staff_id, service_id)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')
$$, '23503', null, 'staff cannot offer another salon''s service');

select lives_ok($$
  insert into public.staff_services (salon_id, staff_id, service_id)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002')
$$, 'staff can offer their own salon''s service');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, '23503', null, 'a booking cannot use another salon''s staff member');

select throws_ok($$
  insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Negative', 30, -1)
$$, '23514', null, 'prices cannot be negative');

select throws_ok($$
  insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Odd', 7, 100)
$$, '23514', null, 'durations must be multiples of 5 minutes');

select throws_ok($$
  insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Zero', 0, 100)
$$, '23514', null, 'durations must be at least 5 minutes');

select throws_ok($$
  insert into public.salons (slug, name) values ('Salon C', 'Salon C')
$$, '23514', null, 'slugs must be lowercase words joined by hyphens');

select throws_ok($$
  insert into public.clients (salon_id, full_name, phone)
  values ('a0000000-0000-4000-8000-000000000001', 'Test Client', '0712345678')
$$, '23514', null, 'client phones must be in E.164 format');

select lives_ok($$
  insert into public.clients (salon_id, full_name, phone)
  values ('a0000000-0000-4000-8000-000000000001', 'Test Client', '+254700000001')
$$, 'an E.164 phone is accepted');

select * from finish();
rollback;
```

### `04_rls.sql`
```sql
begin;
select plan(19);

-- Fixtures (as the test superuser, which bypasses RLS)
insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff-a@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'owner-b@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');

insert into public.salons (id, slug, name, is_published) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B', false);

insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Wanjiku');

insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'owner', null);

insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 15, 1000),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Braids', 60, 2500);

insert into public.clients (id, salon_id, full_name, phone) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Client A', '+254700000001'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Client B', '+254700000002');

insert into public.bookings (id, salon_id, staff_id, client_id, status, period) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'confirmed', tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03')),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000002', 'confirmed', tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'));

-- Anonymous visitor
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.salons), 1, 'anon sees only published salons');
select is((select count(*)::int from public.clients), 0, 'anon cannot read clients');
select is((select count(*)::int from public.bookings), 0, 'anon cannot read bookings');
select is((select count(*)::int from public.services), 1, 'anon sees only services of published salons');
select throws_ok($$ insert into public.salons (slug, name) values ('x-salon', 'X') $$,
  '42501', null, 'anon cannot create salons directly');
reset role;

-- Staff member of salon A
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.services where salon_id = 'a0000000-0000-4000-8000-000000000001'), 1,
  'staff see their salon''s services');
select is((select count(*)::int from public.clients), 1, 'staff see only their salon''s clients');
select throws_ok($$ insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Staff service', 30, 500) $$,
  '42501', null, 'staff cannot create services');
select results_eq($$ with u as (update public.salons set name = 'Changed by staff'
  where id = 'a0000000-0000-4000-8000-000000000001' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'staff cannot edit the salon');
reset role;

-- Owner of salon A
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.clients), 1, 'an owner sees only their own clients');
select is((select count(*)::int from public.bookings), 1, 'an owner sees only their own bookings');
select results_eq($$ with u as (update public.salons set name = 'Hacked'
  where id = 'a0000000-0000-4000-8000-000000000002' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'an owner cannot edit another salon');
select lives_ok($$ insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Wash', 30, 800) $$,
  'an owner can add a service to their salon');
select throws_ok($$ insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000002', 'Sneaky', 30, 800) $$,
  '42501', null, 'an owner cannot add a service to another salon');
reset role;

-- Owner of salon B (unpublished)
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.salons), 2, 'an owner sees their unpublished salon plus published ones');
reset role;

-- Signed-in user with no salon
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is((select count(*)::int from public.salons), 1, 'an outsider sees only published salons');
select is((select count(*)::int from public.clients), 0, 'an outsider sees no clients');
select is((select count(*)::int from public.bookings), 0, 'an outsider sees no bookings');
select throws_ok($$ insert into public.salon_members (salon_id, user_id, role)
  values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'owner') $$,
  '42501', null, 'an outsider cannot make themselves an owner');
reset role;

select * from finish();
rollback;
```

### `05_create_salon.sql`
```sql
begin;
select plan(5);

insert into auth.users (id, email)
values ('d0000000-0000-4000-8000-000000000004', 'new-owner@example.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';

select lives_ok($$ select public.create_salon('Glow Studio', 'glow-studio') $$,
  'a signed-in user can create a salon');
select is(
  (select m.role::text from public.salon_members m
     join public.salons s on s.id = m.salon_id
    where s.slug = 'glow-studio' and m.user_id = 'd0000000-0000-4000-8000-000000000004'),
  'owner', 'the creator becomes the owner');
select throws_ok($$ select public.create_salon('Another Glow', 'glow-studio') $$,
  '23505', null, 'slugs are unique');
select throws_ok($$ select public.create_salon('Bad Slug', 'Bad Slug') $$,
  '23514', null, 'invalid slugs are rejected');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.create_salon('Anon Salon', 'anon-salon') $$,
  '42501', null, 'anonymous visitors cannot create salons');
reset role;

select * from finish();
rollback;
```

## Acceptance criteria
- [ ] All five acceptance files pass unmodified in CI (`supabase test db`), plus any tests you add.
- [ ] `pnpm check` and CI green; generated types committed and up to date.
- [ ] After merge, the deploy workflow applies the migrations to `bookflow-dev`; report the run link.
- [ ] Report whether Docker was available locally.

## Out of scope
Availability calculation, holds via function, booking creation for clients, auth flows, UI.
