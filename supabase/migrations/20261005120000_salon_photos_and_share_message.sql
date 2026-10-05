-- Release 0.5.1: up to six salon photos (the first is the banner) and the owner's share message.

-- Salon photos -------------------------------------------------------------------

create table public.salon_photos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  path text not null,
  position smallint not null check (position between 0 and 5),
  created_at timestamptz not null default now(),
  unique (salon_id, position),
  unique (salon_id, path)
);

alter table public.salon_photos enable row level security;

create policy "salon_photos: read published or own"
  on public.salon_photos for select to anon, authenticated
  using (private.is_salon_published(salon_id) or private.is_salon_member(salon_id));

-- Writes only go through set_salon_photos.
revoke insert, update, delete, truncate on public.salon_photos from anon, authenticated;
grant select on public.salon_photos to anon, authenticated;

-- Each salon's current banner becomes its first photo.
insert into public.salon_photos (salon_id, path, position)
select id, banner_path, 0 from public.salons where banner_path is not null;

-- Replaces the salon's photos in the given order and keeps salons.banner_path on the first.
-- An empty list is allowed: publishing still checks for a banner.
create function public.set_salon_photos(p_salon_id uuid, p_paths text[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_paths text[] := coalesce(p_paths, array[]::text[]);
  v_count int := coalesce(cardinality(p_paths), 0);
begin
  if not private.is_salon_owner(p_salon_id) then
    raise exception 'Only an owner can change the salon photos' using errcode = '42501';
  end if;

  if v_count > 6 then
    raise exception 'A salon has at most 6 photos' using errcode = 'BF400';
  end if;

  if exists (
    select 1 from unnest(v_paths) p
     where p is null
        or left(p, length(p_salon_id::text) + 1) <> p_salon_id::text || '/'
        or right(p, 4) <> '.jpg'
  ) then
    raise exception 'Photos must be JPEG files in this salon''s folder' using errcode = 'BF400';
  end if;

  if (select count(distinct p) from unnest(v_paths) p) <> v_count then
    raise exception 'The same photo is listed twice' using errcode = 'BF400';
  end if;

  delete from public.salon_photos where salon_id = p_salon_id;

  insert into public.salon_photos (salon_id, path, position)
  select p_salon_id, p.path, (p.n - 1)::smallint
    from unnest(v_paths) with ordinality as p (path, n);

  update public.salons
     set banner_path = v_paths[1]
   where id = p_salon_id and banner_path is distinct from v_paths[1];
end;
$$;

revoke execute on function public.set_salon_photos(uuid, text[]) from public, anon;
grant execute on function public.set_salon_photos(uuid, text[]) to authenticated;

-- Share message ----------------------------------------------------------------------

-- Saved by owners through the existing "salons: owners update" policy; null means the default.
alter table public.salons
  add column share_message text check (char_length(share_message) <= 200);
