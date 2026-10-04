/** "2nd floor, Galana Plaza, Kilimani, Nairobi" → "Kilimani, Nairobi": the area line under the salon name. */
export function shortArea(address: string | null): string | null {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.slice(-2).join(", ") : null;
}

/**
 * The area line: from the address, else from the place name behind the salon's Google Maps link
 * (for salons that only saved a link).
 */
export function areaLine(address: string | null, placeName: string | null): string | null {
  return shortArea(address) ?? shortArea(placeName);
}
