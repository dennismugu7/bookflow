const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
// "/@lat,lng" in place links, or q= / query= / ll= in search links.
const AT_PIN = new RegExp(String.raw`/@(${NUMBER}),(${NUMBER})`);
const PARAM_PIN = new RegExp(
  String.raw`[?&](?:q|query|ll)=(${NUMBER})(?:,|%2C)(${NUMBER})(?:[&#]|$)`,
  "i",
);

/**
 * Reads the pin from a full Google Maps link. Short links (maps.app.goo.gl) need a network
 * redirect to resolve, so they return null like any other link without coordinates.
 */
export function parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
  const match = AT_PIN.exec(url) ?? PARAM_PIN.exec(url);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Public URL of an object in the salon-media bucket, from its stored path. */
export function mediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/salon-media/${path}`;
}
