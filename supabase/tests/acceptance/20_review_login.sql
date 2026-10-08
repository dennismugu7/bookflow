-- Release 1.0.1: the reviewer login's demo salon and its rate-limit table.
begin;
select plan(16);

insert into auth.users (id, email)
values ('d0000000-0000-4000-8000-0000000000aa', 'support@mugu-labs.com');

-- Noon today in Nairobi, so "earlier", "now" and "later today" all fit in the day.
create function pg_temp.review_now() returns timestamptz language sql stable as $$
  select (((now() at time zone 'Africa/Nairobi')::date + time '12:00') at time zone 'Africa/Nairobi');
$$;
create function pg_temp.review_day(p_offset int) returns bigint language sql stable as $$
  select count(*) from public.bookings b
    join public.salon_members m on m.salon_id = b.salon_id
   where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'
     and b.status in ('confirmed', 'completed')
     and (lower(b.period) at time zone 'Africa/Nairobi')::date
         = (pg_temp.review_now() at time zone 'Africa/Nairobi')::date + p_offset;
$$;

-- ensure_review_demo creates exactly one salon, with 5 services and 8 clients.
select lives_ok(
  $$ select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa', pg_temp.review_now()) $$,
  'ensure_review_demo runs for the review user');
select is((select count(*)::int from public.salon_members
            where user_id = 'd0000000-0000-4000-8000-0000000000aa' and role = 'owner'), 1,
  'the review user owns exactly one salon');
select is((select s.name || ' | ' || s.slug from public.salons s
             join public.salon_members m on m.salon_id = s.id
            where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'), 'Demo Salon | demo-salon',
  'it is Demo Salon at demo-salon');
select is((select count(*)::int from public.services v
             join public.salon_members m on m.salon_id = v.salon_id
            where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'), 5, 'with 5 services');
select is((select count(*)::int from public.clients c
             join public.salon_members m on m.salon_id = c.salon_id
            where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'), 8, 'and 8 clients');

-- Calling it twice adds no duplicates.
create temp table first_run as
  select (select count(*) from public.salons) as salons,
         (select count(*) from public.services) as services,
         (select count(*) from public.clients) as clients,
         (select count(*) from public.bookings) as bookings;
select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa', pg_temp.review_now());
select is(
  (select row((select count(*) from public.salons), (select count(*) from public.services),
              (select count(*) from public.clients), (select count(*) from public.bookings))::text),
  (select row(salons, services, clients, bookings)::text from first_run),
  'calling it twice adds no salons, services, clients or bookings');

-- Bookings exist for today, tomorrow and in 3 days (Nairobi).
select ok(pg_temp.review_day(0) >= 3, 'at least 3 bookings today');
select ok(exists (
  select 1 from public.bookings b join public.salon_members m on m.salon_id = b.salon_id
   where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'
     and b.status = 'confirmed' and b.period @> pg_temp.review_now()),
  'one of them is in progress');
select ok(exists (
  select 1 from public.bookings b join public.salon_members m on m.salon_id = b.salon_id
   where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'
     and b.status = 'completed' and upper(b.period) <= pg_temp.review_now()),
  'one was served earlier');
select ok(pg_temp.review_day(1) >= 2, 'at least 2 bookings tomorrow');
select ok(pg_temp.review_day(3) >= 1, 'at least 1 booking in 3 days');

-- All phones match +2547000000__ and all emails end with @example.com.
select is((select count(*)::int from public.clients c
             join public.salon_members m on m.salon_id = c.salon_id
            where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'
              and (c.phone is null or c.phone not like '+2547000000__'
                   or c.email is null or c.email not like '%@example.com')), 0,
  'every client has a +2547000000__ phone and an @example.com email');
select is((select count(*)::int from public.salons s
             join public.salon_members m on m.salon_id = s.id
            where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'
              and s.phone is not null and s.phone not like '+2547000000__'), 0,
  'the salon phone is fake too');

-- anon/authenticated can't use private.review_sign_in_attempts or the function.
set local role anon;
select throws_ok($$ select count(*) from private.review_sign_in_attempts $$, '42501', null,
  'anon cannot read the sign-in attempts');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-0000000000aa","role":"authenticated"}';
select throws_ok($$ insert into private.review_sign_in_attempts default values $$, '42501', null,
  'authenticated cannot write the sign-in attempts');
select throws_ok(
  $$ select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa') $$, '42501', null,
  'authenticated cannot run ensure_review_demo');
reset role;

select * from finish();
rollback;
