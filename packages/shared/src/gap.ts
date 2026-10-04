/**
 * How often a client usually comes back, for the client profile (owner-v4 05): days under two
 * weeks ("~10 days"), otherwise rounded weeks ("~5 wks"); exactly a week reads "~1 wk".
 * "—" when there aren't two visits yet.
 */
export function formatUsualGap(days: number | null | undefined): string {
  if (days === null || days === undefined || !Number.isFinite(days) || days < 0) return "—";
  const whole = Math.max(1, Math.round(days));
  if (whole < 14 && whole !== 7) return `~${whole} ${whole === 1 ? "day" : "days"}`;
  const weeks = Math.round(whole / 7);
  return `~${weeks} ${weeks === 1 ? "wk" : "wks"}`;
}
