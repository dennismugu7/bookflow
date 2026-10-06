-- Release 1.0.0 part 2 (B): get_day_agenda also returns `next`, the first confirmed booking after
-- the day, so Today can show it when the day itself is empty (salons that open only on some days).

create or replace function public.get_day_agenda(p_salon_id uuid, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_salon public.salons;
  v_day tstzrange;
  v_open tstzmultirange;
  v_busy tstzmultirange;
  v_from timestamptz;
  v_bookings jsonb;
  v_gaps jsonb;
  v_next jsonb;
begin
  if not private.is_salon_member(p_salon_id) then
    raise exception 'Not a member of this salon' using errcode = '42501';
  end if;
  if p_date is null then
    raise exception 'A date is required' using errcode = 'BF400';
  end if;

  select * into v_salon from public.salons s where s.id = p_salon_id;
  v_day := tstzrange(p_date::timestamp at time zone v_salon.timezone,
                     (p_date + 1)::timestamp at time zone v_salon.timezone);

  select coalesce(jsonb_agg(private.agenda_booking_item(b) order by lower(b.period), b.id), '[]'::jsonb)
    into v_bookings
    from public.bookings b
   where b.salon_id = p_salon_id
     and b.status in ('confirmed', 'completed', 'no_show')
     and lower(b.period) <@ v_day;

  -- Open time for the weekday, minus everything taken by any staff member.
  select range_agg(tstzrange((p_date + oh.opens) at time zone v_salon.timezone,
                             (p_date + oh.closes) at time zone v_salon.timezone))
    into v_open
    from public.opening_hours oh
   where oh.salon_id = p_salon_id and oh.weekday = extract(isodow from p_date);

  select range_agg(b.period) into v_busy
    from public.bookings b
   where b.salon_id = p_salon_id
     and b.period && v_day
     and (b.status in ('confirmed', 'completed', 'no_show')
          or (b.status = 'held' and b.hold_expires_at > now()));

  -- Today, nothing before now, rounded up to the next 5 minutes.
  if p_date = (now() at time zone v_salon.timezone)::date then
    v_from := to_timestamp(ceil(extract(epoch from now()) / 300) * 300);
    v_open := v_open * tstzmultirange(tstzrange(v_from, null));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'starts_at', lower(g),
           'ends_at', upper(g),
           'minutes', (extract(epoch from upper(g) - lower(g)) / 60)::int)
         order by lower(g)), '[]'::jsonb)
    into v_gaps
    from unnest(coalesce(v_open, '{}'::tstzmultirange) - coalesce(v_busy, '{}'::tstzmultirange)) as g
   where upper(g) - lower(g) >= interval '30 minutes';

  -- The first booking after the day, so an empty Today can still point to it (release 1.0.0).
  select private.agenda_booking_item(b) into v_next
    from public.bookings b
   where b.salon_id = p_salon_id
     and b.status = 'confirmed'
     and lower(b.period) >= upper(v_day)
   order by lower(b.period), b.id
   limit 1;

  return jsonb_build_object(
    'date', p_date,
    'next', coalesce(v_next, 'null'::jsonb),
    'stats', jsonb_build_object(
      'booked', (select count(*) from jsonb_array_elements(v_bookings) x
                  where x ->> 'status' in ('confirmed', 'completed')),
      'expected_kes', (select coalesce(sum((x ->> 'total_kes')::int), 0) from jsonb_array_elements(v_bookings) x
                        where x ->> 'status' in ('confirmed', 'completed')),
      'free_min', (select coalesce(sum((x ->> 'minutes')::int), 0) from jsonb_array_elements(v_gaps) x)),
    'bookings', v_bookings,
    'gaps', v_gaps);
end;
$$;
