-- Row-level security. Every table in public has RLS on; access is decided per salon and role.

-- Helpers --------------------------------------------------------------------
-- security definer so they can read salon_members without tripping its own policies.

create function private.is_salon_member(salon uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.salon_members m
    where m.salon_id = salon and m.user_id = (select auth.uid())
  );
$$;

create function private.is_salon_owner(salon uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.salon_members m
    where m.salon_id = salon and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- The staff profile the current login acts as in this salon (null for owners without one).
create function private.my_staff_id(salon uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.staff_id from public.salon_members m
  where m.salon_id = salon and m.user_id = (select auth.uid());
$$;

create function private.is_salon_published(salon uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.salons s where s.id = salon and s.is_published);
$$;

grant usage on schema private to anon, authenticated;
grant execute on all functions in schema private to anon, authenticated;

-- Enable RLS everywhere ----------------------------------------------------------

alter table public.salons enable row level security;
alter table public.salon_members enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.staff_services enable row level security;
alter table public.opening_hours enable row level security;
alter table public.staff_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_services enable row level security;
alter table public.booking_events enable row level security;

-- salons: public when published; owners edit. Creation goes through create_salon().

create policy "salons: read published or own"
  on public.salons for select to anon, authenticated
  using (is_published or private.is_salon_member(id));

create policy "salons: owners update"
  on public.salons for update to authenticated
  using (private.is_salon_owner(id))
  with check (private.is_salon_owner(id));

-- salon_members ----------------------------------------------------------------

create policy "salon_members: read own row or own salon"
  on public.salon_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_salon_member(salon_id));

create policy "salon_members: owners insert"
  on public.salon_members for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "salon_members: owners update"
  on public.salon_members for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "salon_members: owners delete"
  on public.salon_members for delete to authenticated
  using (private.is_salon_owner(salon_id));

-- staff, opening_hours, staff_services: public when the salon is published ------

create policy "staff: read published or own"
  on public.staff for select to anon, authenticated
  using (private.is_salon_published(salon_id) or private.is_salon_member(salon_id));

create policy "staff: owners insert"
  on public.staff for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "staff: owners update"
  on public.staff for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "staff: owners delete"
  on public.staff for delete to authenticated
  using (private.is_salon_owner(salon_id));

create policy "opening_hours: read published or own"
  on public.opening_hours for select to anon, authenticated
  using (private.is_salon_published(salon_id) or private.is_salon_member(salon_id));

create policy "opening_hours: owners insert"
  on public.opening_hours for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "opening_hours: owners update"
  on public.opening_hours for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "opening_hours: owners delete"
  on public.opening_hours for delete to authenticated
  using (private.is_salon_owner(salon_id));

create policy "staff_services: read published or own"
  on public.staff_services for select to anon, authenticated
  using (private.is_salon_published(salon_id) or private.is_salon_member(salon_id));

create policy "staff_services: owners insert"
  on public.staff_services for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "staff_services: owners update"
  on public.staff_services for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "staff_services: owners delete"
  on public.staff_services for delete to authenticated
  using (private.is_salon_owner(salon_id));

-- services: public only when the salon is published and the service is bookable --

create policy "services: read bookable or own"
  on public.services for select to anon, authenticated
  using (
    (is_bookable and private.is_salon_published(salon_id))
    or private.is_salon_member(salon_id)
  );

create policy "services: owners insert"
  on public.services for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "services: owners update"
  on public.services for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "services: owners delete"
  on public.services for delete to authenticated
  using (private.is_salon_owner(salon_id));

-- staff_hours, time_off, clients: members read, owners write ------------------

create policy "staff_hours: members read"
  on public.staff_hours for select to authenticated
  using (private.is_salon_member(salon_id));

create policy "staff_hours: owners insert"
  on public.staff_hours for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "staff_hours: owners update"
  on public.staff_hours for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "staff_hours: owners delete"
  on public.staff_hours for delete to authenticated
  using (private.is_salon_owner(salon_id));

create policy "time_off: members read"
  on public.time_off for select to authenticated
  using (private.is_salon_member(salon_id));

create policy "time_off: owners insert"
  on public.time_off for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "time_off: owners update"
  on public.time_off for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "time_off: owners delete"
  on public.time_off for delete to authenticated
  using (private.is_salon_owner(salon_id));

create policy "clients: members read"
  on public.clients for select to authenticated
  using (private.is_salon_member(salon_id));

create policy "clients: owners insert"
  on public.clients for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "clients: owners update"
  on public.clients for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

create policy "clients: owners delete"
  on public.clients for delete to authenticated
  using (private.is_salon_owner(salon_id));

-- bookings: members read; owners insert; owners or the booked staff member update; no delete

create policy "bookings: members read"
  on public.bookings for select to authenticated
  using (private.is_salon_member(salon_id));

create policy "bookings: owners insert"
  on public.bookings for insert to authenticated
  with check (private.is_salon_owner(salon_id));

create policy "bookings: owners or own staff update"
  on public.bookings for update to authenticated
  using (private.is_salon_owner(salon_id) or staff_id = private.my_staff_id(salon_id))
  with check (private.is_salon_owner(salon_id) or staff_id = private.my_staff_id(salon_id));

-- booking_services: no salon_id column, so access follows the parent booking ----

create policy "booking_services: members read"
  on public.booking_services for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.is_salon_member(b.salon_id)
  ));

create policy "booking_services: owners insert"
  on public.booking_services for insert to authenticated
  with check (exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.is_salon_owner(b.salon_id)
  ));

create policy "booking_services: owners update"
  on public.booking_services for update to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.is_salon_owner(b.salon_id)
  ))
  with check (exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.is_salon_owner(b.salon_id)
  ));

create policy "booking_services: owners delete"
  on public.booking_services for delete to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.is_salon_owner(b.salon_id)
  ));

-- booking_events: members read. Written only by security-definer functions (phase 1b).

create policy "booking_events: members read"
  on public.booking_events for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.is_salon_member(b.salon_id)
  ));
