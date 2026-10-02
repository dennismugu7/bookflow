-- Extensions and the non-exposed `private` schema for helpers.

create extension if not exists btree_gist with schema extensions;

-- Not listed in the API's exposed schemas, so nothing here is reachable over PostgREST.
create schema if not exists private;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
