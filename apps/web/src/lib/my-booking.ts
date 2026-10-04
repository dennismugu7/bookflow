import "server-only";

import { createClient } from "./supabase/server";

export type MyBooking = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  total_kes: number;
  staff_name: string;
  salon: {
    name: string;
    slug: string;
    address: string | null;
    maps_url: string | null;
    timezone: string;
  };
  services: { name: string; duration_min: number; price_kes: number }[];
};

/** The signed-in client's booking, or null when signed out or it isn't theirs. */
export async function getMyBooking(id: string): Promise<MyBooking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return null;
  const { data, error } = await supabase.rpc("get_my_booking", { p_booking_id: id });
  if (error || !data) return null;
  return data as unknown as MyBooking;
}

export { directionsUrl } from "./directions";
