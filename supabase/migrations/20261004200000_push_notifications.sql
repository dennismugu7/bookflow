-- Release 0.5.0: push notifications for owners (docs/specs/release-0.5.0-google-and-notifications.md).
-- New web bookings and client cancellations queue a row in private.push_outbox per salon member
-- who wants them; an insert trigger sends it to Expo's push service with pg_net. A pg_cron job
-- queues the 07:00 morning summary. Expo's "enhanced security" is off, so no secret is needed.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Tables ---------------------------------------------------------------------------------------

-- One row per phone. A token moves to whoever registers it last (a shared phone).
create table private.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on private.push_tokens (user_id);

revoke all on private.push_tokens from public, anon, authenticated;

-- No row means the defaults below.
create table private.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  new_bookings boolean not null default true,
  cancellations boolean not null default true,
  morning_summary boolean not null default false,
  updated_at timestamptz not null default now()
);

revoke all on private.notification_prefs from public, anon, authenticated;

create table private.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('new_booking', 'cancellation', 'morning_summary')),
  booking_id uuid references public.bookings (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);

create index push_outbox_booking_id_idx on private.push_outbox (booking_id);
create index push_outbox_summary_idx on private.push_outbox (user_id, salon_id, (data ->> 'date'))
  where kind = 'morning_summary';

revoke all on private.push_outbox from public, anon, authenticated;

-- Tokens ---------------------------------------------------------------------------------------

create function public.register_push_token(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Not an Expo push token' using errcode = 'BF400';
  end if;

  insert into private.push_tokens (token, user_id, updated_at)
  values (p_token, v_user_id, now())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;

create function public.unregister_push_token(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  delete from private.push_tokens where token = p_token and user_id = auth.uid();
end;
$$;

revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- Preferences ----------------------------------------------------------------------------------

create function public.get_notification_prefs()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_prefs private.notification_prefs;
begin
  if v_user_id is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  select * into v_prefs from private.notification_prefs where user_id = v_user_id;
  return jsonb_build_object(
    'new_bookings', coalesce(v_prefs.new_bookings, true),
    'cancellations', coalesce(v_prefs.cancellations, true),
    'morning_summary', coalesce(v_prefs.morning_summary, false)
  );
end;
$$;

revoke execute on function public.get_notification_prefs() from public, anon;
grant execute on function public.get_notification_prefs() to authenticated;

create function public.set_notification_prefs(
  p_new_bookings boolean,
  p_cancellations boolean,
  p_morning_summary boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_new_bookings is null or p_cancellations is null or p_morning_summary is null then
    raise exception 'Every switch needs a value' using errcode = 'BF400';
  end if;

  insert into private.notification_prefs (user_id, new_bookings, cancellations, morning_summary)
  values (v_user_id, p_new_bookings, p_cancellations, p_morning_summary)
  on conflict (user_id) do update
    set new_bookings = excluded.new_bookings,
        cancellations = excluded.cancellations,
        morning_summary = excluded.morning_summary,
        updated_at = now();

  return jsonb_build_object(
    'new_bookings', p_new_bookings,
    'cancellations', p_cancellations,
    'morning_summary', p_morning_summary
  );
end;
$$;

revoke execute on function public.set_notification_prefs(boolean, boolean, boolean) from public, anon;
grant execute on function public.set_notification_prefs(boolean, boolean, boolean) to authenticated;

-- Wording --------------------------------------------------------------------------------------

-- "Today, 14:00", "Tomorrow, 10:30", otherwise "Mon 5 Oct, 10:30", in the salon's zone.
create function private.push_when(p_at timestamptz, p_timezone text)
returns text
language sql
stable
set search_path = ''
as $$
  select case (p_at at time zone p_timezone)::date - (now() at time zone p_timezone)::date
           when 0 then 'Today, '
           when 1 then 'Tomorrow, '
           else to_char(p_at at time zone p_timezone, 'Dy FMDD Mon') || ', '
         end || to_char(p_at at time zone p_timezone, 'HH24:MI');
$$;

-- Booking alerts -------------------------------------------------------------------------------

create function private.queue_booking_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_timezone text;
  v_client text;
  v_services text;
  v_staff text;
  v_when text;
  v_title text;
  v_body text;
begin
  if new.source = 'web' and new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status = 'held') then
    v_kind := 'new_booking';
  elsif tg_op = 'UPDATE' and old.status = 'confirmed' and new.status = 'cancelled'
     and not exists (select 1 from public.salon_members m
                      where m.salon_id = new.salon_id and m.user_id = auth.uid()) then
    v_kind := 'cancellation';
  else
    return null;
  end if;

  select s.timezone into v_timezone from public.salons s where s.id = new.salon_id;
  select c.full_name into v_client from public.clients c where c.id = new.client_id;
  select st.display_name into v_staff from public.staff st where st.id = new.staff_id;
  select string_agg(bs.name, ', ' order by bs.position, bs.created_at) into v_services
    from public.booking_services bs where bs.booking_id = new.id;
  v_when := private.push_when(lower(new.period), v_timezone);

  if v_kind = 'new_booking' then
    v_title := concat_ws(' · ', 'New booking', v_client);
    v_body := concat_ws(' · ', v_services, v_when, 'with ' || v_staff);
  else
    v_title := concat_ws(' · ', 'Booking cancelled', v_client);
    v_body := concat_ws(' · ', v_services, v_when, '"' || nullif(btrim(new.cancel_reason), '') || '"');
  end if;

  insert into private.push_outbox (user_id, kind, booking_id, salon_id, title, body, data)
  select m.user_id, v_kind, new.id, new.salon_id, v_title, v_body,
         jsonb_build_object('kind', v_kind, 'booking_id', new.id,
                            'date', (lower(new.period) at time zone v_timezone)::date::text)
    from public.salon_members m
    left join private.notification_prefs p on p.user_id = m.user_id
   where m.salon_id = new.salon_id
     and case v_kind
           when 'new_booking' then coalesce(p.new_bookings, true)
           else coalesce(p.cancellations, true)
         end;

  return null;
end;
$$;

create trigger bookings_queue_push
  after insert or update of status on public.bookings
  for each row execute function private.queue_booking_push();

-- Morning summary ------------------------------------------------------------------------------

-- Queues today's summary for members who want it, once per salon and local day, during the
-- salon's 07:00 hour, when the day has bookings. Returns how many were queued.
create function public.queue_morning_summaries(p_at timestamptz default now())
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into private.push_outbox (user_id, kind, salon_id, title, body, data)
  select c.user_id, 'morning_summary', c.salon_id,
         'Today at ' || c.salon_name,
         d.n || case when d.n = 1 then ' booking' else ' bookings' end
           || ' · first at ' || to_char(d.first_at at time zone c.timezone, 'HH24:MI')
           || ' with ' || d.first_staff,
         jsonb_build_object('kind', 'morning_summary', 'date', c.day::text)
    from (
      select m.user_id, s.id as salon_id, s.name as salon_name, s.timezone,
             (p_at at time zone s.timezone)::date as day
        from public.salon_members m
        join public.salons s on s.id = m.salon_id
        join private.notification_prefs p on p.user_id = m.user_id and p.morning_summary
       where (p_at at time zone s.timezone)::time >= time '07:00'
         and (p_at at time zone s.timezone)::time < time '08:00'
    ) c
    cross join lateral (
      select count(*) over () as n, lower(b.period) as first_at, st.display_name as first_staff
        from public.bookings b
        join public.staff st on st.id = b.staff_id
       where b.salon_id = c.salon_id
         and b.status in ('confirmed', 'completed')
         and (lower(b.period) at time zone c.timezone)::date = c.day
       order by lower(b.period), st.display_name
       limit 1
    ) d
   where not exists (
     select 1 from private.push_outbox o
      where o.kind = 'morning_summary' and o.user_id = c.user_id and o.salon_id = c.salon_id
        and o.data ->> 'date' = c.day::text
   );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.queue_morning_summaries(timestamptz) from public, anon, authenticated;

select cron.schedule('queue-morning-summaries', '*/15 * * * *',
                     $$select public.queue_morning_summaries()$$);

-- Delivery -------------------------------------------------------------------------------------

-- One message per phone of that person, in one request to Expo. Rows for people without a
-- registered phone stay unsent.
create function private.send_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_messages jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', t.token,
           'title', new.title,
           'body', new.body,
           'data', new.data,
           'sound', 'default',
           'channelId', 'bookings',
           'priority', 'high'
         ) order by t.token)
    into v_messages
    from private.push_tokens t
   where t.user_id = new.user_id;
  if v_messages is null then
    return null;
  end if;

  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_messages,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
    );
    update private.push_outbox set sent_at = now() where id = new.id;
  exception when others then
    update private.push_outbox set error = sqlerrm where id = new.id;
  end;
  return null;
end;
$$;

create trigger push_outbox_send
  after insert on private.push_outbox
  for each row execute function private.send_push();
