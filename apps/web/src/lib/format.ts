/**
 * Money and durations, for display.
 *
 * ══ ONE HELPER OWNS EVERY MONEY STRING ══════════════════════════════════════
 *
 * The same rule `apps/mobile/lib/ui/money.dart` states, for the same reason:
 * the alternative is each screen deciding whether to write `KES 400`, `Ksh 400`
 * or `KES 400.00`, and a price list that spells the currency two ways reads as a
 * bug in the salon rather than in the app.
 *
 * **Whole shillings, no decimal point anywhere.** The project invariant: every
 * money value is an integer count of whole Kenyan shillings. Printing
 * `KES 400.00` would advertise a precision the system does not have and invite
 * the next person to add cents.
 *
 * The thousands separator is a plain comma. v1 is one locale (ADR-005: Kenya,
 * KES, Latin script), so there is nothing to negotiate and `Intl.NumberFormat`
 * would be a larger answer than the question.
 */

/** `1234567` → `KES 1,234,567`. */
export function formatKes(shillings: number): string {
  return `KES ${grouped(shillings)}`;
}

function grouped(value: number): string {
  const negative = value < 0;
  const digits = Math.abs(Math.trunc(value)).toString();

  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    // A separator before every third digit counting from the right, except at
    // the very start — which is what stops `,400`.
    const fromRight = digits.length - i;
    if (i > 0 && fromRight % 3 === 0) out += ',';
    out += digits[i];
  }

  return negative ? `-${out}` : out;
}

/** `20` → `20 mins`, `90` → `1 hr 30 mins`. As a person would say it. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${String(minutes)} mins`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = hours === 1 ? '1 hr' : `${String(hours)} hrs`;

  return rest === 0 ? hourPart : `${hourPart} ${String(rest)} mins`;
}

/** The two initials shown when a team member has no photo. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  const first = parts[0]?.[0] ?? '';
  // The LAST word rather than the second: "Grace Wanjiru Mwangi" reads as GM to
  // the person whose name it is. ADR-005 keeps team names in one field, so
  // there is no first/last split to lean on.
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';

  return (first + last).toUpperCase();
}
