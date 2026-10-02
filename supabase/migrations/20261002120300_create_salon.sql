-- Salon creation: inserts the salon (unpublished) and makes the caller its owner in one step.
-- salons has no insert policy, so this is the only way to create one.

create function public.create_salon(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_salon_id uuid;
begin
  if v_user_id is null then
    raise exception 'create_salon requires a signed-in user' using errcode = '42501';
  end if;

  insert into public.salons (name, slug)
  values (p_name, p_slug)
  returning id into v_salon_id;

  insert into public.salon_members (salon_id, user_id, role)
  values (v_salon_id, v_user_id, 'owner');

  return v_salon_id;
end;
$$;

revoke execute on function public.create_salon(text, text) from public, anon;
grant execute on function public.create_salon(text, text) to authenticated;
