-- Business configuration: everything an owner sets up about their salon.
--
-- Four new tables — services, team_members, opening_hours, portfolio_images —
-- plus the columns on `businesses` the design's onboarding screens collect and
-- the `handle` that ADR-021's public booking link is addressed by.
--
-- MIGRATIONS ARE DO-NOT-VIBE (CLAUDE.md §6). This file is reviewed line by line
-- by a human before it merges.
--
-- Conventions are ADR-036: created_at/updated_at on every table with updated_at
-- maintained by trigger, hard delete only, every constraint named explicitly.
--
-- ── APPLIES TO A FRESH DATABASE AND TO THE CURRENT STAGING SCHEMA ───────────
--
-- Every statement is additive. Nothing is dropped, nothing is rewritten, and no
-- existing column changes type or nullability — so the migration is the same
-- work whether it runs after `20260817160430` on staging or from empty.
--
-- ── WHY THE NEW BUSINESS COLUMNS ARE ALL NULLABLE ──────────────────────────
--
-- Every business that exists today was created by `POST /v1/businesses`, which
-- takes a name and nothing else. A NOT NULL column with no default cannot be
-- added to a table with rows; one with a default would invent content and put
-- it on a real salon's public page. Nullable is the only honest option, and it
-- is also correct going forward: these are optional fields on the design's own
-- screens, marked "(optional)" there.
--
-- `handle` is nullable for a different reason — it does not exist until the
-- business is published, and ADR-021 makes a handle permanent once assigned.

-- ---------------------------------------------------------------------------
-- businesses: the profile fields, and the public address
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column if not exists tagline    text,
  add column if not exists about      text,
  add column if not exists category   text,
  add column if not exists banner_url text,
  add column if not exists address    text,
  add column if not exists maps_url   text,
  add column if not exists handle     text;

comment on column public.businesses.tagline is
  'Optional. "Your business, in a nutshell" on the onboarding screen.';
comment on column public.businesses.about is
  'Optional long-form description. "Tell your story".';
comment on column public.businesses.category is
  'Optional free text (salon, barbershop, spa). NOT an enum: K16 is undecided and an enum would decide it here.';
comment on column public.businesses.banner_url is
  'Optional. A public URL in the public-media bucket, written by the image upload route.';
comment on column public.businesses.maps_url is
  'Optional. A map link the client web app renders beside the address. Free text; nothing here parses it.';

-- ── THE HANDLE IS UNIQUE, AND ONLY WHILE IT EXISTS ─────────────────────────
--
-- A plain UNIQUE constraint already permits many NULLs in PostgreSQL, which is
-- exactly what is wanted: every unpublished business has no handle, and they do
-- not collide with each other.
--
-- ADR-021: handles are never reassigned. Nothing here enforces that — it is a
-- rule about UPDATE and DELETE rather than about uniqueness — and the retirement
-- table that will enforce it belongs with the rename surface that needs it. This
-- constraint stops two live salons sharing an address, which is the part that
-- has a consumer today.
alter table public.businesses
  add constraint uq_businesses_handle unique (handle);

-- Shape, not policy. Lowercase alphanumerics and single hyphens, 3–60 — so a
-- handle can be put in a URL path without escaping and read back out of one.
alter table public.businesses
  add constraint ck_businesses_handle_shape
    check (handle is null or handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.businesses
  add constraint ck_businesses_handle_length
    check (handle is null or length(handle) between 3 and 60);

comment on column public.businesses.handle is
  'The public booking address (ADR-021). Null until published. Unique. Never reassigned once set.';

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
-- What a client can book. ADR-006 snapshots name, duration and price onto a
-- booking at booking time, so a later edit here never rewrites history — which
-- is why these columns can be edited freely and why `service_id` on a booking
-- will be nullable and for reporting only.
create table public.services (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,

  name text not null,
  duration_minutes integer not null,

  -- ── UNITS: WHOLE SHILLINGS, AND THIS DEPARTS FROM CLAUDE.md §5 ───────────
  --
  -- §5 says money is "bigint minor units, KES". This column is an integer of
  -- WHOLE SHILLINGS, on the owner's explicit instruction, because the design
  -- prices services as "KES 400" and Kenyan salon pricing has no cent
  -- component.
  --
  -- What that costs, stated rather than discovered later: when deposits arrive
  -- (ADR-009, B1) they are specified in minor units, so the two will not be in
  -- the same unit and any arithmetic across them needs a conversion someone has
  -- to remember. THIS COMMENT IS THAT REMINDER.
  --
  -- What it does not cost: nothing here is a float or a decimal string, and
  -- `integer` tops out at 2,147,483,647 — comfortably inside JavaScript's safe
  -- integer range, so ADR-016's serialisation assertion has nothing to catch.
  price_kes integer not null,

  -- Display order. Not unique: two services may share a position and fall back
  -- to created_at, which is a stable tiebreak. A unique ordering column turns
  -- every reorder into a multi-statement dance around the constraint.
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_services primary key (id),
  constraint fk_services_business
    foreign key (business_id) references public.businesses (id) on delete cascade,
  constraint ck_services_name_present
    check (length(btrim(name)) between 1 and 200),
  constraint ck_services_duration_positive
    check (duration_minutes > 0 and duration_minutes <= 1440),
  constraint ck_services_price_non_negative
    check (price_kes >= 0),
  -- Two services with the same name on one salon's booking page are
  -- indistinguishable to a client choosing between them.
  constraint uq_services_business_name unique (business_id, name)
);

comment on table public.services is
  'A bookable service. ADR-006: a booking snapshots name, duration and price, so edits here never rewrite history.';
comment on column public.services.price_kes is
  'WHOLE SHILLINGS, not minor units. Departs from CLAUDE.md section 5 deliberately — see the column comment in the migration.';

create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- Every read of this table is "the services of one business", from the owner's
-- app and from the public page alike.
create index ix_services_business on public.services (business_id, position);

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
-- ADR-005: ONE name field, not two. Team members are content records in a
-- Latin-script-only market — the rule that splits first and last applies to the
-- owner's own account and to nothing else.
create table public.team_members (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,

  name text not null,
  -- Job title ("Senior stylist"), not an authorization role. Nothing branches
  -- on it; `memberships.role` is the one that means anything (I9).
  role text,
  about text,
  photo_url text,
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_team_members primary key (id),
  constraint fk_team_members_business
    foreign key (business_id) references public.businesses (id) on delete cascade,
  constraint ck_team_members_name_present
    check (length(btrim(name)) between 1 and 200)
);

comment on table public.team_members is
  'A person a client can book with. ADR-005: one name field. `role` is a job title and never an authorization role.';
comment on column public.team_members.role is
  'Job title. NOT an authorization role — that is memberships.role.';

create trigger trg_team_members_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

create index ix_team_members_business on public.team_members (business_id, position);

-- ---------------------------------------------------------------------------
-- opening_hours
-- ---------------------------------------------------------------------------
-- ADR-010: recurring wall-clock is day-of-week plus a plain local time, and is
-- NEVER a timestamptz. A booking's start and end are instants; these are not,
-- and the two are never interchanged.
--
-- ADR-005 makes Africa/Nairobi an application constant, so there is no timezone
-- column here and must not be one.
create table public.opening_hours (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,

  -- 0 = Monday. Stated because PostgreSQL's own `extract(dow)` is 0 = Sunday
  -- and ISO 8601 is 1 = Monday, so every reader has a different prior and one
  -- of them is going to be wrong by a day.
  day_of_week integer not null,

  open_time time not null,
  close_time time not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_opening_hours primary key (id),
  constraint fk_opening_hours_business
    foreign key (business_id) references public.businesses (id) on delete cascade,
  constraint ck_opening_hours_day_range
    check (day_of_week between 0 and 6),
  -- A10 is undecided — whether a row may cross midnight — and this constraint
  -- decides it as "no" for now, which is the only representable answer: two
  -- plain times with no date cannot express a crossing. Recorded so that
  -- answering A10 the other way is visibly a schema change rather than a
  -- surprise.
  constraint ck_opening_hours_close_after_open
    check (close_time > open_time),
  -- One row per day. A6's "an omitted day means closed" is what makes this
  -- workable: a closed day is an absent row, not a row with equal times.
  constraint uq_opening_hours_business_day unique (business_id, day_of_week)
);

comment on table public.opening_hours is
  'Recurring wall-clock hours (ADR-010). day_of_week 0 = Monday. An omitted day is closed (A6).';
comment on column public.opening_hours.day_of_week is
  '0 = Monday. NOT PostgreSQL extract(dow), which is 0 = Sunday.';

create trigger trg_opening_hours_updated_at
  before update on public.opening_hours
  for each row execute function public.set_updated_at();

create index ix_opening_hours_business on public.opening_hours (business_id, day_of_week);

-- ---------------------------------------------------------------------------
-- portfolio_images
-- ---------------------------------------------------------------------------
-- ADR-011: brand assets go to the PUBLIC content-hashed bucket. This table
-- holds only the URL — the object lives in Storage, and deleting a row is not
-- the same operation as deleting the object. The route does both, in that
-- order, and the reason is in `media.service.ts`.
create table public.portfolio_images (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,

  image_url text not null,
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_portfolio_images primary key (id),
  constraint fk_portfolio_images_business
    foreign key (business_id) references public.businesses (id) on delete cascade,
  constraint ck_portfolio_images_url_present
    check (length(btrim(image_url)) > 0)
);

comment on table public.portfolio_images is
  'A gallery image on the public booking page. The row holds the URL; the object lives in Supabase Storage (ADR-011).';

create trigger trg_portfolio_images_updated_at
  before update on public.portfolio_images
  for each row execute function public.set_updated_at();

create index ix_portfolio_images_business on public.portfolio_images (business_id, position);

-- ---------------------------------------------------------------------------
-- Row-level security: enabled, with NO policies
-- ---------------------------------------------------------------------------
-- The same two independent guards the foundation migration applies, for the
-- same reasons (ADR-013, spike 001/C7). The API bypasses RLS, so this protects
-- nothing the repository layer protects correctly and everything it does not.
--
-- It matters more here than on the foundation tables, not less: these rows are
-- destined for a PUBLIC page, and "it is going to be public anyway" is exactly
-- the reasoning that would leave an unpublished salon's draft readable.
alter table public.services         enable row level security;
alter table public.team_members     enable row level security;
alter table public.opening_hours    enable row level security;
alter table public.portfolio_images enable row level security;

revoke all on public.services         from anon, authenticated;
revoke all on public.team_members     from anon, authenticated;
revoke all on public.opening_hours    from anon, authenticated;
revoke all on public.portfolio_images from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants to the application role
-- ---------------------------------------------------------------------------
-- `20260811180042_application_role.sql` rejects `alter default privileges` and
-- says why: the grant belongs in the same migration as the table, and
-- `role.integration.test.ts` enumerates every table in `public` and asserts all
-- four privileges on each — so a table added without a grant fails a test rather
-- than a request.
--
-- That test is the reason these four lines are not optional, and the reason a
-- fifth table added later cannot quietly forget them.
grant select, insert, update, delete on public.services         to bookflow_api;
grant select, insert, update, delete on public.team_members     to bookflow_api;
grant select, insert, update, delete on public.opening_hours    to bookflow_api;
grant select, insert, update, delete on public.portfolio_images to bookflow_api;
