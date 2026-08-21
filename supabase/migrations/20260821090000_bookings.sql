-- Bookings, and the constraint that makes double-booking impossible.
--
-- MIGRATIONS ARE DO-NOT-VIBE (CLAUDE.md §6), and so is the exclusion constraint
-- specifically — it is named in §6's own list twice over, as "the availability
-- predicate and the exclusion constraint". This file is reviewed line by line by
-- a human before it merges.
--
-- Conventions are ADR-036: created_at/updated_at on every table with updated_at
-- maintained by trigger, hard delete only, every constraint named explicitly.
--
-- ── APPLIES TO A FRESH DATABASE AND TO THE CURRENT STAGING SCHEMA ───────────
--
-- Every statement is additive: one extension, one table, its indexes and its
-- grants. Nothing existing is dropped, rewritten, or changed in type or
-- nullability.

-- ---------------------------------------------------------------------------
-- btree_gist
-- ---------------------------------------------------------------------------
-- The exclusion constraint below mixes equality on scalars (`business_id`, the
-- team member) with overlap on a range. GiST handles the range natively; it
-- needs `btree_gist` to handle `=` on a uuid in the same index.
--
-- `IF NOT EXISTS` because `20260810163827_enable_extensions.sql` may already
-- have it and re-running must be a no-op, not an error.
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
-- ══ WHY THE SERVICE IS SNAPSHOTTED RATHER THAN JOINED ═══════════════════════
--
-- ADR-006: a booking records the service name, duration and price AS THEY WERE
-- at booking time. `service_id` is nullable, `on delete set null`, and is for
-- reporting only — never for display.
--
-- The reason is history. A salon that raises its prices in March must not
-- rewrite what a client agreed to in February, and a service deleted in April
-- must not erase the bookings that used it. A join would do both, silently, and
-- the day anyone noticed would be the day a client disputed a charge.
create table public.bookings (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,

  -- Reporting only. Null once the service is gone; the snapshot below is what
  -- the booking actually was.
  service_id uuid,

  -- ── NULL MEANS "ANY PROFESSIONAL", AND THAT IS A DEPARTURE FROM ADR-006 ───
  --
  -- ADR-006 requires every booking to name a concrete team member — "any
  -- professional" resolves at booking time and is never stored as null. **This
  -- column permits null**, on the owner's explicit instruction, and the cost is
  -- written here rather than discovered later:
  --
  --   * the exclusion constraint below coalesces null to a fixed sentinel uuid,
  --     so every "any professional" booking at one salon contends with every
  --     other one — which is correct when the salon is one person and WRONG the
  --     moment it has two, because two stylists could serve two clients at once
  --     and the constraint would refuse the second;
  --   * A11 (by what rule does "any professional" resolve) stays open, and this
  --     column is where its answer will land.
  --
  -- `on delete set null` so removing a stylist does not delete the bookings
  -- they took — the same history argument as the service.
  team_member_id uuid,

  -- The snapshot. ADR-006's actual subject.
  service_name text not null,
  duration_minutes integer not null,
  -- WHOLE SHILLINGS, matching `services.price_kes`. The project invariant, and
  -- the same departure from CLAUDE.md §5's "minor units" that the services
  -- migration records at length. Consistency between the two matters more than
  -- either choice: a booking whose price is in a different unit from the
  -- service it snapshotted is a bug nobody would see until a total was wrong.
  price_kes integer not null,

  -- The client. No account, no row in `user_profiles`: booking is
  -- unauthenticated (ADR-019 mints an opaque token per booking instead), so
  -- these are the only identity a salon has for the person turning up.
  client_name text not null,
  client_email text not null,
  client_phone text not null,

  -- ADR-010: an instant, therefore timestamptz in UTC. Opening hours are
  -- recurring wall-clock and are NOT interchangeable with this.
  starts_at timestamptz not null,

  -- ══ MAINTAINED BY TRIGGER, AND IT HAS TO BE ═══════════════════════════════
  --
  -- The exclusion constraint below needs a range, and an index expression must
  -- be IMMUTABLE. `starts_at + make_interval(mins => duration_minutes)` is not:
  -- `make_interval` is STABLE, and PostgreSQL refuses it outright —
  --
  --   ERROR: functions in index expression must be marked IMMUTABLE (42P17)
  --
  -- — which is how this column came to exist. A generated column would hit the
  -- same wall for the same reason.
  --
  -- **So the end is stored, and `trg_bookings_ends_at` computes it.** The
  -- trigger rather than the application, for ADR-036's reason about
  -- `updated_at`: a value the application sets is wrong the moment a row is
  -- touched by a migration, a seed, a manual fix or a future worker — and here
  -- being wrong means the constraint guards the wrong interval, which is
  -- exactly the failure it exists to prevent.
  --
  -- Nothing may write this column directly. It is derived, and the trigger
  -- overwrites whatever is supplied.
  ends_at timestamptz not null,

  -- ADR-004's sibling for bookings. `booked` is what an unauthenticated client
  -- creates; the owner moves it on.
  status text not null default 'booked',

  -- ADR-011: proofs live in the PRIVATE bucket behind an authorizing endpoint.
  -- **This column holds a key or URL and confers no access by itself**, and
  -- nothing may serve it directly — the authorizing endpoint that returns a
  -- short-lived signed URL is owed and is not in this migration.
  payment_proof_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_bookings primary key (id),
  constraint fk_bookings_business
    foreign key (business_id) references public.businesses (id) on delete cascade,
  constraint fk_bookings_service
    foreign key (service_id) references public.services (id) on delete set null,
  constraint fk_bookings_team_member
    foreign key (team_member_id) references public.team_members (id) on delete set null,

  constraint ck_bookings_status
    check (status in ('booked', 'confirmed', 'cancelled')),
  constraint ck_bookings_duration_positive
    check (duration_minutes > 0 and duration_minutes <= 1440),
  constraint ck_bookings_price_non_negative
    check (price_kes >= 0),
  constraint ck_bookings_service_name_present
    check (length(btrim(service_name)) between 1 and 200),
  constraint ck_bookings_client_name_present
    check (length(btrim(client_name)) between 1 and 200),
  constraint ck_bookings_client_email_present
    check (length(btrim(client_email)) between 3 and 320),
  constraint ck_bookings_client_phone_present
    check (length(btrim(client_phone)) between 3 and 40)
);

comment on table public.bookings is
  'A booking. Snapshots the service (ADR-006) so later edits and deletes cannot rewrite history.';
comment on column public.bookings.service_id is
  'REPORTING ONLY (ADR-006). Never for display — the snapshot columns are what the booking was.';
comment on column public.bookings.team_member_id is
  'Null = "any professional". Departs from ADR-006; see the migration comment for what that costs.';
comment on column public.bookings.payment_proof_url is
  'ADR-011: the object is PRIVATE. This column confers no access; a signed-URL endpoint is owed.';

create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- `search_path` pinned empty and every reference schema-qualified, for the
-- reason `set_updated_at` gives: this runs with the privileges of whoever fires
-- the trigger, and an unpinned search_path on such a function is a
-- privilege-escalation shape.
create or replace function public.set_booking_ends_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.ends_at = new.starts_at + make_interval(mins => new.duration_minutes);
  return new;
end;
$$;

comment on function public.set_booking_ends_at() is
  'Derives bookings.ends_at. The exclusion constraint needs an IMMUTABLE index expression and make_interval is STABLE.';

-- BEFORE, so it runs ahead of the NOT NULL check and ahead of the exclusion
-- constraint — an insert supplies no `ends_at` and must not have to.
create trigger trg_bookings_ends_at
  before insert or update on public.bookings
  for each row execute function public.set_booking_ends_at();

-- ---------------------------------------------------------------------------
-- The exclusion constraint — DO-NOT-VIBE (CLAUDE.md §6)
-- ---------------------------------------------------------------------------
-- ══ THE DATABASE IS THE AUTHORITY ON DOUBLE-BOOKING ═════════════════════════
--
-- CLAUDE.md §5: *"Booking conflicts are enforced by the database exclusion
-- constraint over (team member, time range, occupying status). Never
-- re-implemented or pre-checked as the authority in application code."*
--
-- The reason is the race, not the tidiness. Two clients hitting "book" on the
-- same slot in the same second both pass any `select`-then-`insert` check the
-- application could write: each reads a free slot, each writes. Only the
-- database can refuse the second, because only the database serialises the two
-- writes. The availability endpoint's job is to OFFER slots that will succeed;
-- this constraint's job is to make certain that the ones that would not, fail.
--
-- ── EACH OPERAND, AND WHY IT IS THERE ──────────────────────────────────────
--
--   business_id WITH =            two salons never contend with each other.
--
--   coalesce(team_member_id, …)   an "any professional" booking has no team
--   WITH =                        member, and NULL is not equal to NULL in SQL
--                                 — so without the coalesce every such booking
--                                 would be exempt from the constraint entirely
--                                 and a salon could double-book itself all day.
--                                 The sentinel is the all-zero uuid: it can
--                                 never collide with a real `team_members.id`,
--                                 which `gen_random_uuid()` produces as v4 with
--                                 fixed version and variant bits.
--
--   tstzrange(starts_at, starts_at + duration) WITH &&
--                                 the overlap itself. `&&` on tstzrange is
--                                 half-open by default — [start, end) — so a
--                                 booking ending at 10:00 and one starting at
--                                 10:00 do NOT overlap, which is the behaviour
--                                 a back-to-back schedule needs.
--
--   WHERE (status <> 'cancelled') a cancelled booking occupies nothing, so its
--                                 slot is bookable again. This is also why
--                                 REINSTATING one can fail: the constraint is
--                                 re-evaluated on the update, and something else
--                                 may have taken the slot in the meantime. The
--                                 API surfaces that as 409 slot-taken rather
--                                 than pretending it cannot happen.
--
-- ── THE APPLICATION MUST MATCH THIS EXACTLY ────────────────────────────────
--
-- The availability predicate computes which slots to offer. If it disagrees with
-- this constraint in the permissive direction, the API offers a slot and then
-- 409s on it — visible, annoying, not dangerous. If it disagrees in the
-- restrictive direction, slots silently disappear and nobody reports it.
-- `availability` in `modules/bookings/` is written against this comment.
alter table public.bookings
  add constraint ex_bookings_no_double_booking
  exclude using gist (
    business_id with =,
    coalesce(team_member_id, '00000000-0000-0000-0000-000000000000'::uuid) with =,
    -- `ends_at` rather than the arithmetic: see the column's comment for why
    -- the expression form is rejected outright. `tstzrange(timestamptz,
    -- timestamptz)` IS immutable, which is what makes this index possible.
    tstzrange(starts_at, ends_at) with &&
  )
  where (status <> 'cancelled');

comment on constraint ex_bookings_no_double_booking on public.bookings is
  'DO-NOT-VIBE. The sole authority on double-booking (CLAUDE.md section 5). Never pre-checked in application code.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- The owner's list, newest first, optionally filtered by status. The exclusion
-- constraint's GiST index cannot serve this — it is built for overlap, not for
-- ordering.
create index ix_bookings_business_starts_at
  on public.bookings (business_id, starts_at desc);

-- The contacts view groups by email within one business.
create index ix_bookings_business_client_email
  on public.bookings (business_id, client_email);

-- ---------------------------------------------------------------------------
-- Row-level security: enabled, with NO policies
-- ---------------------------------------------------------------------------
-- The same two independent guards every other table carries (ADR-013, spike
-- 001/C7), and this is the table where they matter most: these rows hold a
-- named person's email and phone number, and a payment proof's location.
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants to the application role
-- ---------------------------------------------------------------------------
-- In the same migration as the table, as `20260811180042_application_role.sql`
-- requires — `role.integration.test.ts` enumerates every table in `public` and
-- asserts all four privileges, so a missing grant fails a test rather than a
-- request.
grant select, insert, update, delete on public.bookings to bookflow_api;
