const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
// "/@lat,lng" in place links, or q= / query= / ll= in search links.
const AT_PIN = new RegExp(String.raw`/@(${NUMBER}),(${NUMBER})`);
// The exact place pin in "data=…!3d<lat>!4d<lng>"; "@lat,lng" is only the map centre.
const EXACT_PIN = new RegExp(String.raw`!3d(${NUMBER})!4d(${NUMBER})`);
const PARAM_PIN = new RegExp(
  String.raw`[?&](?:q|query|ll)=(${NUMBER})(?:,|%2C)(${NUMBER})(?:[&#]|$)`,
  "i",
);

export type LatLng = { lat: number; lng: number };

/**
 * Reads the pin from a full Google Maps link, preferring the exact place pin over the map
 * centre. Short links (maps.app.goo.gl) return null here; `resolveMapsLink` follows them.
 */
export function parseGoogleMapsLink(url: string): LatLng | null {
  const match = EXACT_PIN.exec(url) ?? AT_PIN.exec(url) ?? PARAM_PIN.exec(url);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function isGoogleShortLink(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.startsWith("/maps"));
}

/** Google sometimes lands on a cookie consent page that carries the real URL in `continue`. */
function consentTarget(finalUrl: string): string | null {
  try {
    const url = new URL(finalUrl);
    if (!url.hostname.toLowerCase().startsWith("consent.google.")) return null;
    return url.searchParams.get("continue");
  } catch {
    return null;
  }
}

/**
 * Reads the pin from any Google Maps link, including the short links the Google Maps app
 * shares. Only Google short-link hosts are ever fetched; anything else, a network error or a
 * link without a pin gives null.
 */
export async function resolveMapsLink(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LatLng | null> {
  const direct = parseGoogleMapsLink(url);
  if (direct) return direct;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (!isGoogleShortLink(parsed)) return null;

  try {
    const response = await fetchImpl(parsed.toString(), { redirect: "follow" });
    const finalUrl = response.url;
    if (!finalUrl) return null;
    const pin = parseGoogleMapsLink(finalUrl);
    if (pin) return pin;
    const target = consentTarget(finalUrl);
    return target ? parseGoogleMapsLink(target) : null;
  } catch {
    return null;
  }
}

/**
 * Links Bookflow accepts as a salon's Google Maps link. The database check on
 * `salons.maps_url` uses the same pattern.
 */
export const GOOGLE_MAPS_URL =
  /^https:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps|(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?\/)/i;

export function isGoogleMapsUrl(url: string): boolean {
  return GOOGLE_MAPS_URL.test(url.trim());
}

/** "Galito's+Lusaka+Road,+Nairobi" from `/maps/place/<name>/…`, decoded; null if absent. */
function placeNameFrom(url: string): string | null {
  const match = /\/maps\/place\/([^/?#]+)/.exec(url);
  if (!match) return null;
  try {
    const name = decodeURIComponent(match[1]!.replace(/\+/g, " ")).trim();
    return name || null;
  } catch {
    return null;
  }
}

export type MapsLinkInfo = { mapsUrl: string; placeName: string | null; pin: LatLng | null };

/**
 * Checks a link the owner pasted. Long Google Maps links are read locally; short links from the
 * Google Maps app are followed (only those hosts are ever fetched) because they usually carry a
 * place name and ID rather than coordinates. Returns null for non-Google links or when a short
 * link can't be checked. `mapsUrl` is the pasted link itself, which opens the exact place.
 */
export async function inspectMapsLink(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MapsLinkInfo | null> {
  const mapsUrl = url.trim();
  if (!isGoogleMapsUrl(mapsUrl)) return null;

  let parsed: URL;
  try {
    parsed = new URL(mapsUrl);
  } catch {
    return null;
  }

  let finalUrl = mapsUrl;
  if (isGoogleShortLink(parsed)) {
    try {
      const response = await fetchImpl(parsed.toString(), { redirect: "follow" });
      if (!response.url) return null;
      finalUrl = consentTarget(response.url) ?? response.url;
    } catch {
      return null;
    }
  }

  return { mapsUrl, placeName: placeNameFrom(finalUrl), pin: parseGoogleMapsLink(finalUrl) };
}

/** Google's keyless embed for a small map preview of a place or address. */
export function mapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Public URL of an object in the salon-media bucket, from its stored path. */
export function mediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/salon-media/${path}`;
}
