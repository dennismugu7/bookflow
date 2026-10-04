/**
 * Shortens a whole-shilling amount for the Today tiles: 800 → "800", 9300 → "9.3k",
 * 23000 → "23k", 1250000 → "1.3M". One decimal at most, dropped when it is zero.
 */
export function compactKes(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError(`compactKes expects a non-negative integer, got ${amount}`);
  }
  if (amount < 1000) return String(amount);
  const short = (value: number) => String(Math.round(value * 10) / 10);
  const thousands = Math.round((amount / 1000) * 10) / 10;
  // 999,950 rounds to 1000k; show it as 1M instead.
  return thousands < 1000 ? `${short(amount / 1000)}k` : `${short(amount / 1_000_000)}M`;
}

/** A duration as the Today screen shows it: 30 → "30m", 60 → "1h", 150 → "2h 30m". */
export function formatMinutes(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new RangeError(`formatMinutes expects a non-negative integer, got ${minutes}`);
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
