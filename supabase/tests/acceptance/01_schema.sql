begin;
select plan(14);

select has_extension('btree_gist', 'btree_gist is installed');

select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every public table has row-level security enabled'
);

select has_table('public', t::name, 'table ' || t || ' exists')
  from unnest(array[
    'salons','salon_members','staff','services','staff_services','opening_hours',
    'staff_hours','time_off','clients','bookings','booking_services','booking_events'
  ]) as t;

select * from finish();
rollback;
