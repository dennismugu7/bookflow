-- Core data model. Business rules live in constraints so neither app can bypass them.

create type public.member_role as enum ('owner', 'staff');
create type public.booking_status as enum ('held', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired');

-- Salons ---------------------------------------------------------------------

create table public.salons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  name text not null check (char_length(name) between 1 and 80),
  tagline text,
  about text,
  address text,
  latitude numeric,
  longitude numeric,
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  logo_path text,
  banner_path text,
  timezone text not null default 'Africa/Nairobi',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger salons_set_updated_at before update on public.salons
  for each row execute function private.set_updated_at();

-- Staff ----------------------------------------------------------------------

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  display_name text not null,
  title text,
  bio text,
  photo_path text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, id)
);

create trigger staff_set_updated_at before update on public.staff
  for each row execute function private.set_updated_at();

-- Members: which logins belong to a salon, and as which staff profile ----------

create table public.salon_members (
  salon_id uuid not null references public.salons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  staff_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (salon_id, user_id),
  foreign key (salon_id, staff_id) references public.staff (salon_id, id)
);

create index salon_members_user_id_idx on public.salon_members (user_id);

create trigger salon_members_set_updated_at before update on public.salon_members
  for each row execute function private.set_updated_at();

-- Services -------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  name text not null,
  duration_min int not null check (duration_min between 5 and 600 and duration_min % 5 = 0),
  price_kes int not null check (price_kes >= 0),
  is_bookable boolean not null default true,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, id)
);

create trigger services_set_updated_at before update on public.services
  for each row execute function private.set_updated_at();

-- Composite FKs make cross-salon links impossible.
create table public.staff_services (
  salon_id uuid not null,
  staff_id uuid not null,
  service_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (staff_id, service_id),
  foreign key (salon_id, staff_id) references public.staff (salon_id, id) on delete cascade,
  foreign key (salon_id, service_id) references public.services (salon_id, id) on delete cascade
);

create index staff_services_salon_service_idx on public.staff_services (salon_id, service_id);

-- Hours ----------------------------------------------------------------------

create table public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  opens time not null,
  closes time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes > opens)
);

create index opening_hours_salon_weekday_idx on public.opening_hours (salon_id, weekday);

create trigger opening_hours_set_updated_at before update on public.opening_hours
  for each row execute function private.set_updated_at();

-- A staff member with no rows for a weekday follows the salon's opening hours.
create table public.staff_hours (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null,
  staff_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  starts time not null,
  ends time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends > starts),
  foreign key (salon_id, staff_id) references public.staff (salon_id, id) on delete cascade
);

create index staff_hours_staff_weekday_idx on public.staff_hours (salon_id, staff_id, weekday);

create trigger staff_hours_set_updated_at before update on public.staff_hours
  for each row execute function private.set_updated_at();

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null,
  staff_id uuid not null,
  period tstzrange not null check (not isempty(period)),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (salon_id, staff_id) references public.staff (salon_id, id) on delete cascade
);

create index time_off_staff_period_idx on public.time_off using gist (staff_id, period);

create trigger time_off_set_updated_at before update on public.time_off
  for each row execute function private.set_updated_at();

-- Clients --------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  full_name text not null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  user_id uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, phone),
  unique (salon_id, id)
);

create index clients_user_id_idx on public.clients (user_id);

create trigger clients_set_updated_at before update on public.clients
  for each row execute function private.set_updated_at();

-- Bookings -------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  staff_id uuid not null,
  client_id uuid,
  status public.booking_status not null,
  period tstzrange not null
    check (not isempty(period) and lower_inc(period) and not upper_inc(period)),
  hold_expires_at timestamptz check (status <> 'held' or hold_expires_at is not null),
  total_kes int not null default 0 check (total_kes >= 0),
  source text not null default 'owner' check (source in ('web', 'owner')),
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (salon_id, staff_id) references public.staff (salon_id, id),
  foreign key (salon_id, client_id) references public.clients (salon_id, id),
  -- No double bookings per staff member. Expired holds are excluded by status, not by now()
  -- (not allowed in a constraint); phase 1b's booking function expires overlapping holds first.
  constraint bookings_no_overlap exclude using gist (staff_id with =, period with &&)
    where (status in ('held', 'confirmed', 'completed', 'no_show'))
);

create index bookings_salon_period_idx on public.bookings using gist (salon_id, period);
create index bookings_client_id_idx on public.bookings (client_id);

create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();

-- Snapshot of what was booked, so later price or name changes don't rewrite history.
create table public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid not null references public.services (id),
  name text not null,
  duration_min int not null check (duration_min > 0),
  price_kes int not null check (price_kes >= 0),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index booking_services_booking_id_idx on public.booking_services (booking_id);
create index booking_services_service_id_idx on public.booking_services (service_id);

-- Append-only audit trail.
create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  actor_id uuid,
  type text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index booking_events_booking_id_idx on public.booking_events (booking_id);

revoke update, delete, truncate on public.booking_events from anon, authenticated, service_role;
