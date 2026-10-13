-- Reschedule a booking (QA report 8663, S-01; docs/specs/qa-8663-reschedule.md).

-- reschedule_booking --------------------------------------------------------------------------

-- An owner moves a confirmed booking to a new start: same professional, services, price, client
-- and length. Opening hours aren't enforced (the app warns first); overlaps are, by the exclusion
-- constraint. No push: queue_booking_push fires on status changes only.
create function public.reschedule_booking(p_booking_id uuid, p_starts_at timestamptz)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings;
  v_period tstzrange;
begin
  if v_user_id is null then
    raise exception 'Sign in to change bookings' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings b
   where b.id = p_booking_id and private.is_salon_member(b.salon_id)
   for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'BF404';
  end if;

  if not private.is_salon_owner(v_booking.salon_id) then
    raise exception 'Only owners can move bookings' using errcode = '42501';
  end if;

  if v_booking.status <> 'confirmed' then
    raise exception 'Only confirmed bookings can be moved' using errcode = 'BF422';
  end if;

  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Pick a time in the future' using errcode = 'BF400';
  end if;

  if p_starts_at = lower(v_booking.period) then
    return;
  end if;

  v_period := tstzrange(p_starts_at, p_starts_at + (upper(v_booking.period) - lower(v_booking.period)));

  -- Lapsed holds still count for the exclusion constraint until they are marked expired.
  update public.bookings b set status = 'expired'
   where b.staff_id = v_booking.staff_id and b.status = 'held'
     and b.hold_expires_at <= now() and b.period && v_period;

  begin
    update public.bookings set period = v_period where id = v_booking.id;
  exception when exclusion_violation then
    raise exception 'That time is taken' using errcode = 'BF409';
  end;

  insert into public.booking_events (booking_id, actor_id, type, data)
  values (v_booking.id, v_user_id, 'rescheduled',
          jsonb_build_object('from', lower(v_booking.period), 'to', p_starts_at));
end;
$$;

revoke execute on function public.reschedule_booking(uuid, timestamptz) from public, anon;
grant execute on function public.reschedule_booking(uuid, timestamptz) to authenticated;
