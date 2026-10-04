/** Directions link: the salon's own Google Maps link, else a search for its address. */
export function directionsUrl(mapsUrl: string | null, address: string | null): string | null {
  if (mapsUrl) return mapsUrl;
  if (address)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}
