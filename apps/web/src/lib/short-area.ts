/** "2nd floor, Galana Plaza, Kilimani, Nairobi" → "Kilimani, Nairobi": the area line under the salon name. */
export function shortArea(address: string | null): string | null {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.slice(-2).join(", ") : null;
}
