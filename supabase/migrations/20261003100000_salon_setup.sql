-- Phase 2b: salon setup. Publishing is validated here, and salon media lives in a public bucket.

-- Setup status -----------------------------------------------------------------

-- No access check: callers below check membership or ownership first.
create function private.salon_setup_status(p_salon_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'services', exists (
      select 1 from public.services s where s.salon_id = p_salon_id and s.is_bookable
    ),
    'team', exists (
      select 1
        from public.staff st
        join public.staff_services ss on ss.staff_id = st.id and ss.salon_id = st.salon_id
        join public.services s on s.id = ss.service_id and s.salon_id = ss.salon_id
       where st.salon_id = p_salon_id and st.is_active and s.is_bookable
    ),
    'hours', exists (
      select 1 from public.opening_hours oh where oh.salon_id = p_salon_id
    )
  );
$$;

create function public.salon_setup_status(p_salon_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_salon_member(p_salon_id) then
    raise exception 'Not a member of this salon' using errcode = '42501';
  end if;
  return private.salon_setup_status(p_salon_id);
end;
$$;

revoke execute on function private.salon_setup_status(uuid) from public, anon, authenticated;
revoke execute on function public.salon_setup_status(uuid) from public, anon;
grant execute on function public.salon_setup_status(uuid) to authenticated;

-- Publishing ---------------------------------------------------------------------

create function public.set_salon_published(p_salon_id uuid, p_published boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status jsonb;
  v_missing text[];
begin
  if not private.is_salon_owner(p_salon_id) then
    raise exception 'Only an owner can publish or unpublish this salon' using errcode = '42501';
  end if;

  if p_published then
    v_status := private.salon_setup_status(p_salon_id);
    select array_agg(key order by key) into v_missing
      from jsonb_each(v_status) where value = 'false'::jsonb;
    if v_missing is not null then
      raise exception 'Finish setting up before publishing: %', array_to_string(v_missing, ', ')
        using errcode = 'BF422', detail = array_to_string(v_missing, ',');
    end if;
  end if;

  update public.salons set is_published = p_published where id = p_salon_id;
end;
$$;

revoke execute on function public.set_salon_published(uuid, boolean) from public, anon;
grant execute on function public.set_salon_published(uuid, boolean) to authenticated;

-- App roles go through set_salon_published, so the owners-update policy can't skip the checks.
create function private.guard_salon_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (tg_op = 'INSERT' and new.is_published
          or tg_op = 'UPDATE' and new.is_published is distinct from old.is_published) then
    raise exception 'Use set_salon_published' using errcode = 'BF403';
  end if;
  return new;
end;
$$;

create trigger salons_guard_published before insert or update on public.salons
  for each row execute function private.guard_salon_published();

-- Media ----------------------------------------------------------------------------

-- Public reads; the storage API only accepts JPEG up to 5 MB (the app resizes before upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salon-media', 'salon-media', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- True when the object's first folder is a salon the caller owns. Compared as text, so a
-- folder that isn't a UUID simply doesn't match instead of raising a cast error.
create function private.owns_media_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.salon_members m
     where m.user_id = (select auth.uid())
       and m.role = 'owner'
       and m.salon_id::text = (storage.foldername(p_name))[1]
  );
$$;

grant execute on function private.owns_media_folder(text) to authenticated;

create policy "salon-media: owners insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'salon-media' and private.owns_media_folder(name));

create policy "salon-media: owners update"
  on storage.objects for update to authenticated
  using (bucket_id = 'salon-media' and private.owns_media_folder(name))
  with check (bucket_id = 'salon-media' and private.owns_media_folder(name));

create policy "salon-media: owners delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'salon-media' and private.owns_media_folder(name));

-- Deleting through the storage API reads the row first; public URLs don't need this.
create policy "salon-media: owners read"
  on storage.objects for select to authenticated
  using (bucket_id = 'salon-media' and private.owns_media_folder(name));

-- Opening hours ----------------------------------------------------------------------

-- Replaces the salon's weekly hours in one transaction, so a failed save never leaves the
-- week half-deleted. p_hours: [{"weekday": 1, "opens": "10:00", "closes": "18:00"}, ...]
-- (weekday 1 = Monday ... 7 = Sunday; "24:00" closes at midnight).
create function public.set_opening_hours(p_salon_id uuid, p_hours jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.is_salon_owner(p_salon_id) then
    raise exception 'Only an owner can change opening hours' using errcode = '42501';
  end if;
  if jsonb_typeof(p_hours) is distinct from 'array' then
    raise exception 'Hours must be a list' using errcode = 'BF400';
  end if;

  create temp table new_hours on commit drop as
    select (h ->> 'weekday')::smallint as weekday, (h ->> 'opens')::time as opens, (h ->> 'closes')::time as closes
      from jsonb_array_elements(p_hours) as h;

  if exists (select 1 from new_hours where weekday is null or opens is null or closes is null
                                         or weekday not between 1 and 7 or closes <= opens) then
    raise exception 'Each range needs a day and a closing time after its opening time' using errcode = 'BF400';
  end if;
  if exists (select 1 from new_hours a join new_hours b
               on a.weekday = b.weekday and a.ctid < b.ctid and a.opens < b.closes and b.opens < a.closes) then
    raise exception 'Opening ranges on the same day overlap' using errcode = 'BF400';
  end if;

  delete from public.opening_hours where salon_id = p_salon_id;
  insert into public.opening_hours (salon_id, weekday, opens, closes)
    select p_salon_id, weekday, opens, closes from new_hours;
  drop table new_hours;
end;
$$;

revoke execute on function public.set_opening_hours(uuid, jsonb) from public, anon;
grant execute on function public.set_opening_hours(uuid, jsonb) to authenticated;
