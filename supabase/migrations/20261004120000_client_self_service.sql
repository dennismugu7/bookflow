-- Phase 3b: clients list their bookings, cancel up to 2 hours before, and confirm a repeat
-- booking in one tap.

-- Settings: adds the client cancel cutoff ---------------------------------------------------

-- Callers read the settings with `select * into <record>`, so adding a column at the end is safe.
drop function private.booking_settings();

create function private.booking_settings(
  out slot_step interval,
  out lead_time interval,
  out horizon_days int,
  out hold_duration interval,
  out holds_per_ip_per_hour int,
  out client_cancel_cutoff interval
)
language sql
immutable
set search_path = ''
as $$
  select interval '15 minutes', interval '30 minutes', 60, interval '10 minutes', 10, interval '2 hours';
$$;

-- get_my_bookings ---------------------------------------------------------------------------

-- Every booking of the signed-in client across all salons, newest first. Same item shape as
-- get_my_booking, plus the salon's phone and each service's id (for "Book again").
create function public.get_my_bookings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in to see your bookings' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', b.id,
             'status', b.status,
             'starts_at', lower(b.period),
             'ends_at', upper(b.period),
             'total_kes', b.total_kes,
             'staff_name', st.display_name,
             'salon', jsonb_build_object(
               'name', s.name, 'slug', s.slug, 'address', s.address,
               'maps_url', s.maps_url, 'timezone', s.timezone, 'phone', s.phone),
             'services', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'service_id', bs.service_id, 'name', bs.name,
                        'duration_min', bs.duration_min, 'price_kes', bs.price_kes)
                      order by bs.position)
                 from public.booking_services bs
                where bs.booking_id = b.id), '[]'::jsonb))
           order by lower(b.period) desc, b.id)
      from public.bookings b
      join public.clients c on c.id = b.client_id and c.salon_id = b.salon_id
      join public.salons s on s.id = b.salon_id
      join public.staff st on st.id = b.staff_id
     where c.user_id = v_user_id
       and b.status not in ('held', 'expired')), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_my_bookings() from public, anon;
grant execute on function public.get_my_bookings() to authenticated;

-- cancel_my_booking -------------------------------------------------------------------------

-- The client cancels their own confirmed booking, up to the cutoff before it starts. The time is
-- bookable again at once: the exclusion constraint ignores cancelled bookings.
create function public.cancel_my_booking(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings record;
  v_booking public.bookings;
  v_reason text := left(nullif(btrim(p_reason), ''), 200);
begin
  if v_user_id is null then
    raise exception 'Sign in to cancel a booking' using errcode = '42501';
  end if;
  select * into v_settings from private.booking_settings();

  select b.* into v_booking
    from public.bookings b
    join public.clients c on c.id = b.client_id and c.salon_id = b.salon_id
   where b.id = p_booking_id and c.user_id = v_user_id
   for update of b;
  if not found then
    raise exception 'Booking not found' using errcode = 'BF404';
  end if;

  if v_booking.status <> 'confirmed' then
    raise exception 'Cannot cancel a % booking', v_booking.status using errcode = 'BF422';
  end if;
  if lower(v_booking.period) <= now() + v_settings.client_cancel_cutoff then
    raise exception 'Too late to cancel online' using errcode = 'BF422';
  end if;

  update public.bookings
     set status = 'cancelled', cancel_reason = v_reason
   where id = v_booking.id;

  insert into public.booking_events (booking_id, actor_id, type, data)
  values (v_booking.id, v_user_id, 'status_changed',
          jsonb_build_object('from', 'confirmed', 'to', 'cancelled', 'reason', v_reason, 'by', 'client'));
end;
$$;

revoke execute on function public.cancel_my_booking(uuid, text) from public, anon;
grant execute on function public.cancel_my_booking(uuid, text) to authenticated;

-- get_my_client_profile ---------------------------------------------------------------------

-- The caller's saved name and phone at a published salon, or null for a first-time client.
create function public.get_my_client_profile(p_salon_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object('full_name', c.full_name, 'phone', c.phone)
      from public.clients c
      join public.salons s on s.id = c.salon_id
     where s.slug = p_salon_slug and s.is_published and c.user_id = v_user_id
  );
end;
$$;

revoke execute on function public.get_my_client_profile(text) from public, anon;
grant execute on function public.get_my_client_profile(text) to authenticated;
