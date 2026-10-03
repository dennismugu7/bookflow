import "server-only";

import { inspectMapsLink, mediaUrl, type Database } from "@bookflow/shared";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getEnv } from "../env";

export type SalonService = { id: string; name: string; duration_min: number; price_kes: number };
export type SalonStaff = {
  id: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  serviceIds: string[];
};
export type PublicSalon = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  address: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  services: SalonService[];
  staff: SalonStaff[];
  hours: { weekday: number; opens: string; closes: string }[];
};

/** Anonymous client without cookies, so salon pages can be cached and revalidated. */
function publicClient() {
  const env = getEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** A published salon with what clients can book; null when missing or unpublished (RLS hides it). */
export const getPublicSalon = cache(async (slug: string): Promise<PublicSalon | null> => {
  const supabase = publicClient();
  const env = getEnv();
  const { data: salon } = await supabase
    .from("salons")
    .select(
      "id, slug, name, tagline, about, address, maps_url, latitude, longitude, timezone, logo_path, banner_path, updated_at",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!salon) return null;

  const [services, staff, hours] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_min, price_kes")
      .eq("salon_id", salon.id)
      .eq("is_bookable", true)
      .order("sort_order", { nullsFirst: false })
      .order("created_at"),
    supabase
      .from("staff")
      .select("id, display_name, title, photo_path, updated_at, staff_services(service_id)")
      .eq("salon_id", salon.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("opening_hours")
      .select("weekday, opens, closes")
      .eq("salon_id", salon.id)
      .order("opens"),
  ]);

  const media = (path: string | null, version: string) =>
    path
      ? `${mediaUrl(env.NEXT_PUBLIC_SUPABASE_URL, path)}?v=${encodeURIComponent(version)}`
      : null;
  const bookable = new Set((services.data ?? []).map((s) => s.id));

  return {
    id: salon.id,
    slug: salon.slug,
    name: salon.name,
    tagline: salon.tagline,
    about: salon.about,
    address: salon.address,
    mapsUrl: salon.maps_url,
    latitude: salon.latitude,
    longitude: salon.longitude,
    timezone: salon.timezone,
    logoUrl: media(salon.logo_path, salon.updated_at),
    bannerUrl: media(salon.banner_path, salon.updated_at),
    services: services.data ?? [],
    staff: (staff.data ?? [])
      .map((s) => ({
        id: s.id,
        name: s.display_name,
        title: s.title,
        photoUrl: media(s.photo_path, s.updated_at),
        serviceIds: s.staff_services.map((x) => x.service_id).filter((id) => bookable.has(id)),
      }))
      .filter((s) => s.serviceIds.length > 0),
    hours: hours.data ?? [],
  };
});

/** The place name behind a saved Google Maps link, cached for a day. */
const placeNameFor = unstable_cache(
  async (mapsUrl: string) => (await inspectMapsLink(mapsUrl))?.placeName ?? null,
  ["maps-place-name"],
  { revalidate: 86_400 },
);

/** What the map preview should search for: the pin, else the place name, else the address. */
export async function mapQuery(salon: PublicSalon): Promise<string | null> {
  if (salon.latitude !== null && salon.longitude !== null)
    return `${salon.latitude},${salon.longitude}`;
  if (salon.mapsUrl) {
    const place = await placeNameFor(salon.mapsUrl).catch(() => null);
    if (place) return place;
  }
  return salon.address || null;
}
