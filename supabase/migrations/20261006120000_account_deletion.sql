-- Release prep 1: owners and clients delete their account (Google Play's account deletion
-- policy). The server route /api/account/delete removes the salon photos, calls
-- delete_account_data with the secret key, then deletes the auth user.

-- Why people leave, kept without saying who they are -------------------------------------------

create table private.deletion_feedback (
  id uuid primary key default gen_random_uuid(),
  reason text not null check (reason in ('accident', 'other_app', 'too_complicated', 'other')),
  details text check (char_length(details) <= 300),
  role text check (role in ('owner', 'client')),
  created_at timestamptz not null default now()
);

revoke all on private.deletion_feedback from public, anon, authenticated;

-- get_account_deletion_summary --------------------------------------------------------------

-- The salons where the person is the only owner. Shared by the summary and the deletion, so
-- what the confirm screen lists is exactly what goes.
create function private.salons_owned_alone(p_user_id uuid)
returns table (salon_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.salon_id
    from public.salon_members m
   where m.user_id = p_user_id
     and m.role = 'owner'
     and not exists (
       select 1 from public.salon_members o
        where o.salon_id = m.salon_id and o.role = 'owner' and o.user_id <> p_user_id
     );
$$;

-- What the confirm screen names: the caller's email and the salons deleted with them (those
-- they own alone), each with its confirmed bookings still to come.
create function public.get_account_deletion_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'email', (select u.email from auth.users u where u.id = (select auth.uid())),
    'salons', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', s.id,
                 'name', s.name,
                 'upcoming', (
                   select count(*) from public.bookings b
                    where b.salon_id = s.id
                      and b.status = 'confirmed'
                      and lower(b.period) > now()
                 )
               )
               order by s.name
             )
        from private.salons_owned_alone((select auth.uid())) as o
        join public.salons s on s.id = o.salon_id
    ), '[]'::jsonb)
  );
$$;

revoke execute on function private.salons_owned_alone(uuid) from public, anon, authenticated;
revoke execute on function public.get_account_deletion_summary() from public, anon;
grant execute on function public.get_account_deletion_summary() to authenticated;

-- delete_account_data -------------------------------------------------------------------------

-- Everything except the auth user, which the server deletes next. Memberships in shared salons,
-- push tokens and preferences go with the auth user; clients.user_id becomes null then.
create function public.delete_account_data(p_user_id uuid, p_reason text, p_details text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
  v_salons uuid[];
begin
  if p_reason is null or p_reason not in ('accident', 'other_app', 'too_complicated', 'other') then
    raise exception 'Pick a reason' using errcode = 'BF400';
  end if;
  if char_length(v_details) > 300 then
    raise exception 'Details must be at most 300 characters' using errcode = 'BF400';
  end if;

  insert into private.deletion_feedback (reason, details, role)
  values (
    p_reason,
    v_details,
    case
      when exists (select 1 from public.salon_members m where m.user_id = p_user_id) then 'owner'
      else 'client'
    end
  );

  select coalesce(array_agg(o.salon_id), array[]::uuid[]) into v_salons
    from private.salons_owned_alone(p_user_id) as o;

  -- The audit trail has no cascade (it's append-only for everyone else), so clear it first.
  delete from public.booking_events e
   using public.bookings b
   where b.id = e.booking_id and b.salon_id = any (v_salons);

  delete from public.salons s where s.id = any (v_salons);

  -- Salons keep the visit record, without the email.
  update public.clients c set email = null where c.user_id = p_user_id;
end;
$$;

revoke execute on function public.delete_account_data(uuid, text, text) from public, anon, authenticated;
grant execute on function public.delete_account_data(uuid, text, text) to service_role;
