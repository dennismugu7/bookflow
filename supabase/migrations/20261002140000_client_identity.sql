-- Phase 1c: clients confirm with Google or an email code; the phone they give is unverified (ADR 0007).

alter table public.clients
  add column email text,
  add column phone_verified boolean not null default false;

-- Unverified phones may repeat: two people can type the same number. Only a verified phone, or the
-- signed-in user, identifies a client.
alter table public.clients drop constraint clients_salon_id_phone_key;
create unique index clients_salon_id_verified_phone_key on public.clients (salon_id, phone) where phone_verified;
create unique index clients_salon_id_user_id_key on public.clients (salon_id, user_id) where user_id is not null;

-- Only the confirm functions (security definer, running as the table owner) can mark a phone verified.
-- An app write cannot set the flag, and changing a verified phone clears it.
create function private.guard_client_phone_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.phone_verified := false;
    elsif new.phone is distinct from old.phone then
      new.phone_verified := false;
    else
      new.phone_verified := old.phone_verified;
    end if;
  end if;
  return new;
end;
$$;

create trigger clients_guard_phone_verified before insert or update on public.clients
  for each row execute function private.guard_client_phone_verified();

-- Phone normalisation, shared with normalizeKenyanPhone in @bookflow/shared --------------

create function private.normalize_kenyan_phone(p_input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when v.p ~ '^\+[1-9][0-9]{7,14}$' then v.p
    else null
  end
  from (
    select case
      when s.s ~ '^0[0-9]{9}$' then '+254' || substr(s.s, 2)
      when s.s ~ '^254[0-9]{9}$' then '+' || s.s
      else s.s
    end as p
    from (select regexp_replace(coalesce(p_input, ''), '[[:space:]()-]', '', 'g') as s) as s
  ) as v;
$$;

-- Verified-phone path (future "Verify with WhatsApp") ---------------------------------

create or replace function public.confirm_booking(p_hold_token text, p_full_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text;
  v_name text := btrim(p_full_name);
  v_token_hash text;
  v_booking public.bookings;
  v_client_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to confirm a booking' using errcode = '42501';
  end if;

  select nullif(btrim(u.phone), '') into v_phone from auth.users u where u.id = v_user_id;
  if v_phone is null then
    raise exception 'A verified phone number is required' using errcode = 'BF401';
  end if;
  if left(v_phone, 1) <> '+' then
    v_phone := '+' || v_phone;
  end if;

  if v_name is null or char_length(v_name) not between 1 and 80 then
    raise exception 'Name must be 1-80 characters' using errcode = 'BF400';
  end if;

  v_token_hash := private.hold_token_hash(p_hold_token);

  select * into v_booking from public.bookings b
   where b.hold_token_hash = v_token_hash and b.status = 'held'
   for update;
  if not found then
    raise exception 'Hold not found' using errcode = 'BF404';
  end if;
  if v_booking.hold_expires_at <= now() then
    -- Note: the raise rolls this back; a lapsed hold is already ignored by availability.
    update public.bookings set status = 'expired' where id = v_booking.id;
    raise exception 'Hold expired' using errcode = 'BF410';
  end if;

  -- The user's own client record wins; the phone is now verified.
  update public.clients c
     set phone = v_phone, phone_verified = true
   where c.salon_id = v_booking.salon_id and c.user_id = v_user_id
  returning c.id into v_client_id;

  if v_client_id is null then
    -- Keep an existing client's name: the owner may have edited it.
    insert into public.clients as c (salon_id, full_name, phone, user_id, phone_verified)
    values (v_booking.salon_id, v_name, v_phone, v_user_id, true)
    on conflict (salon_id, phone) where phone_verified do update
      set user_id = coalesce(c.user_id, excluded.user_id)
    returning c.id into v_client_id;
  end if;

  update public.bookings
     set status = 'confirmed', client_id = v_client_id, hold_token_hash = null
   where id = v_booking.id;

  insert into public.booking_events (booking_id, actor_id, type)
  values (v_booking.id, v_user_id, 'confirmed');

  return v_booking.id;
end;
$$;

-- Contact path: Google or email code, phone typed by the client --------------------------

create function public.confirm_booking_contact(p_hold_token text, p_full_name text, p_phone text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user auth.users;
  v_name text := btrim(p_full_name);
  v_phone text;
  v_token_hash text;
  v_booking public.bookings;
  v_client_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to confirm a booking' using errcode = '42501';
  end if;

  select * into v_user from auth.users u where u.id = v_user_id;
  if not found or v_user.email_confirmed_at is null or coalesce(v_user.is_anonymous, false) then
    raise exception 'A confirmed email sign-in is required' using errcode = 'BF401';
  end if;

  if v_name is null or char_length(v_name) not between 1 and 80 then
    raise exception 'Name must be 1-80 characters' using errcode = 'BF400';
  end if;

  v_phone := private.normalize_kenyan_phone(p_phone);
  if v_phone is null then
    raise exception 'Enter a valid phone number' using errcode = 'BF400';
  end if;

  v_token_hash := private.hold_token_hash(p_hold_token);

  select * into v_booking from public.bookings b
   where b.hold_token_hash = v_token_hash and b.status = 'held'
   for update;
  if not found then
    raise exception 'Hold not found' using errcode = 'BF404';
  end if;
  if v_booking.hold_expires_at <= now() then
    -- Note: the raise rolls this back; a lapsed hold is already ignored by availability.
    update public.bookings set status = 'expired' where id = v_booking.id;
    raise exception 'Hold expired' using errcode = 'BF410';
  end if;

  -- One client per user per salon. Keep the name (the owner may have edited it) and never
  -- overwrite a verified phone with a typed one. The phone alone never matches another record.
  insert into public.clients as c (salon_id, full_name, phone, email, user_id, phone_verified)
  values (v_booking.salon_id, v_name, v_phone, v_user.email, v_user_id, false)
  on conflict (salon_id, user_id) where user_id is not null do update
    set phone = case when c.phone_verified then c.phone else excluded.phone end,
        email = coalesce(c.email, excluded.email)
  returning c.id into v_client_id;

  update public.bookings
     set status = 'confirmed', client_id = v_client_id, hold_token_hash = null
   where id = v_booking.id;

  insert into public.booking_events (booking_id, actor_id, type, data)
  values (v_booking.id, v_user_id, 'confirmed', '{"method": "contact"}');

  return v_booking.id;
end;
$$;

revoke execute on function public.confirm_booking_contact(text, text, text) from public, anon;
grant execute on function public.confirm_booking_contact(text, text, text) to authenticated;
