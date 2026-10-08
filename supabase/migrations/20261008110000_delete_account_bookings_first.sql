-- Fix: deleting an owner account failed once a booking had services (booking_services_service_id_fkey),
-- because the salon delete cascaded to services before the bookings' line items were gone. The
-- bookings are now deleted first. Same function otherwise.

create or replace function public.delete_account_data(p_user_id uuid, p_reason text, p_details text)
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

  -- Bookings before services: booking_services points at both, and a salon-wide cascade can check
  -- the services link before the bookings link has removed the row.
  delete from public.bookings b where b.salon_id = any (v_salons);

  delete from public.salons s where s.id = any (v_salons);

  -- Salons keep the visit record, without the email.
  update public.clients c set email = null where c.user_id = p_user_id;
end;
$$;
