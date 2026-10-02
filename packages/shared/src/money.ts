/**
 * Formats a whole-shilling amount for display, e.g. 1200 → "KES 1,200".
 * Money is stored as integer KES (see CLAUDE.md), so fractions and negatives are bugs upstream.
 */
export function formatKes(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`formatKes expects an integer amount, got ${amount}`);
  }
  if (amount < 0) {
    throw new RangeError(`formatKes expects a non-negative amount, got ${amount}`);
  }
  // Group manually rather than via Intl so output is identical on Node and Hermes.
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `KES ${grouped}`;
}
