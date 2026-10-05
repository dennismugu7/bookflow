// Deleting an account (release prep 1): the reasons, the details limit and the confirm text,
// shared by the owner app, the web page and the server route.

export const SUPPORT_EMAIL = "support@mugu-labs.com";

/** Longest "Something else" text (matches the database check). */
export const DELETION_DETAILS_MAX = 300;

/** The counter under the text box shows from this many characters. */
export const DELETION_COUNTER_FROM = 250;

export const DELETION_REASONS = [
  { value: "accident", label: "I created this account by accident." },
  { value: "other_app", label: "I found another app that better suits my needs" },
  { value: "too_complicated", label: "The app is too complicated" },
  { value: "other", label: "Something else (Tell us more)" },
] as const;

export type DeletionReason = (typeof DELETION_REASONS)[number]["value"];

export const DELETION_REASON_VALUES = DELETION_REASONS.map((r) => r.value) as [
  DeletionReason,
  ...DeletionReason[],
];

export function isDeletionReason(value: unknown): value is DeletionReason {
  return typeof value === "string" && (DELETION_REASON_VALUES as string[]).includes(value);
}

/** Continue works once a reason is chosen, and some text is typed for "Something else". */
export function canContinueDeletion(reason: DeletionReason | undefined, details: string): boolean {
  if (!reason) return false;
  if (details.trim().length > DELETION_DETAILS_MAX) return false;
  return reason !== "other" || details.trim().length > 0;
}

/** "262/300" when the text is close to the limit, otherwise null. */
export function deletionCounter(details: string): string | null {
  return details.length >= DELETION_COUNTER_FROM
    ? `${details.length}/${DELETION_DETAILS_MAX}`
    : null;
}

export type DeletionSummarySalon = { id: string; name: string; upcoming: number };
export type DeletionSummary = { email: string | null; salons: DeletionSummarySalon[] };

/** Reads get_account_deletion_summary's JSON; null when it isn't the expected shape. */
export function parseDeletionSummary(data: unknown): DeletionSummary | null {
  if (!data || typeof data !== "object") return null;
  const { email, salons } = data as { email?: unknown; salons?: unknown };
  if (!Array.isArray(salons)) return null;
  const parsed: DeletionSummarySalon[] = [];
  for (const salon of salons as unknown[]) {
    if (!salon || typeof salon !== "object") return null;
    const { id, name, upcoming } = salon as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string" || typeof upcoming !== "number")
      return null;
    parsed.push({ id, name, upcoming });
  }
  return { email: typeof email === "string" ? email : null, salons: parsed };
}

/** A text run of the confirm paragraph; bold runs are the salon names. */
export type TextPart = { text: string; bold?: boolean };

/**
 * The confirm paragraph of owner-v7 04, naming the salons deleted with the account. Without a
 * salon it is just "your account".
 */
export function deletionConfirmParts(salons: { name: string }[]): TextPart[] {
  const end = "Please confirm you understand by ticking the below statement:";
  if (salons.length === 0) {
    return [
      {
        text: `This action will delete your account, and you won't be able to retrieve it. ${end}`,
      },
    ];
  }
  const parts: TextPart[] = [{ text: "This action will delete your account and " }];
  salons.forEach((salon, i) => {
    if (i > 0) parts.push({ text: i === salons.length - 1 ? " and " : ", " });
    parts.push({ text: salon.name, bold: true });
  });
  const one = salons.length === 1;
  parts.push({
    text: `, with ${one ? "its" : "their"} bookings, clients and photos, and you won't be able to retrieve ${one ? "it" : "them"}. ${end}`,
  });
  return parts;
}

/** The tick-box statement: owners lose their client bookings, clients their own bookings. */
export function deletionStatement(salonCount: number): string {
  return salonCount > 0
    ? "I know I won't be able to access my client bookings."
    : "I know I won't be able to access my bookings.";
}

/** The upcoming-bookings warning, or null when there are none. */
export function upcomingWarningParts(salons: { upcoming: number }[]): TextPart[] | null {
  const total = salons.reduce((sum, s) => sum + s.upcoming, 0);
  if (total <= 0) return null;
  return [
    { text: "You have " },
    { text: `${total} upcoming ${total === 1 ? "booking" : "bookings"}`, bold: true },
    { text: ". Clients aren't told automatically, so let them know first." },
  ];
}
