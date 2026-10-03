-- Fake salon for the review screenshots (e2e/screenshots.spec.ts). Local Supabase only; fake names.
delete from public.booking_events where booking_id in
  (select id from public.bookings where salon_id = 'a0000000-0000-4000-8000-0000000000aa');
delete from public.booking_services where booking_id in
  (select id from public.bookings where salon_id = 'a0000000-0000-4000-8000-0000000000aa');
delete from public.bookings where salon_id = 'a0000000-0000-4000-8000-0000000000aa';
delete from public.clients where salon_id = 'a0000000-0000-4000-8000-0000000000aa';
delete from public.salons where id = 'a0000000-0000-4000-8000-0000000000aa';
delete from private.hold_log;

insert into public.salons (id, slug, name, tagline, about, address, is_published, timezone)
values ('a0000000-0000-4000-8000-0000000000aa', 'amani-beauty', 'Amani Beauty Studio',
        'Natural hair, braids and silk presses',
        'At Amani Beauty Studio we look after natural hair with patience and care. Whether you are coming in for a fresh silk press, protective braids or a deep conditioning treatment, our team takes the time to understand your hair and how you like to wear it. Walk-ins are welcome when there is space, but booking guarantees your time.',
        '2nd floor, Galana Plaza, Kilimani, Nairobi', true, 'Africa/Nairobi');

insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-0000000000aa', w, '09:00', '18:00' from generate_series(1, 6) as w;

insert into public.services (id, salon_id, name, duration_min, price_kes, sort_order) values
  ('c0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-0000000000aa', 'Silk press', 60, 1500, 1),
  ('c0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000aa', 'Box braids', 180, 3500, 2),
  ('c0000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000aa', 'Deep conditioning', 30, 1000, 3),
  ('c0000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000aa', 'Wash and set', 45, 1200, 4),
  ('c0000000-0000-4000-8000-0000000000a5', 'a0000000-0000-4000-8000-0000000000aa', 'Trim', 30, 800, 5),
  ('c0000000-0000-4000-8000-0000000000a6', 'a0000000-0000-4000-8000-0000000000aa', 'Locs retwist', 90, 2500, 6);

insert into public.staff (id, salon_id, display_name, title, bio, sort_order) values
  ('b0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-0000000000aa', 'Njeri Kamau', 'Stylist',
   'Njeri has eight years of experience with natural hair and loves a sleek silk press that lasts all week.', 1),
  ('b0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000aa', 'Achieng Ouma', 'Braider',
   'Achieng specialises in protective styles: box braids, cornrows and twists, done neatly and kindly.', 2),
  ('b0000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000aa', 'Wanjiru Mwangi', 'Silk press specialist',
   'Wanjiru focuses on healthy heat styling and treatments that keep hair strong.', 3);

insert into public.staff_services (salon_id, staff_id, service_id)
  select 'a0000000-0000-4000-8000-0000000000aa', st, sv
    from unnest(array['b0000000-0000-4000-8000-0000000000a1', 'b0000000-0000-4000-8000-0000000000a2',
                      'b0000000-0000-4000-8000-0000000000a3']::uuid[]) as st,
         unnest(array['c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2',
                      'c0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a4',
                      'c0000000-0000-4000-8000-0000000000a5', 'c0000000-0000-4000-8000-0000000000a6']::uuid[]) as sv;
