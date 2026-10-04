import { validateWeek, type Range, type Week } from "./setup";

/** "30 min", as on the service cards (owner-v2 02). */
export function minutesLabel(minutes: number): string {
  return `${minutes} min`;
}

const WEEKDAY_NUMBER: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Today's weekday in the salon's zone, Monday = 1 (the opening_hours numbering). */
export function weekdayIn(timeZone: string, date: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone }).format(date);
  return WEEKDAY_NUMBER[name] ?? 1;
}

// Initial circles on My team (owner-v2 04): the first two are sampled from the mockup.
const AVATAR_TINTS = ["#C98B67", "#8A6FD1", "#4F9E86", "#D08A3E", "#5B8DD6", "#C8687E"];

/** A stable colour for a team member's initials circle. */
export function avatarTint(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]!;
}

// Opening hours day editor (owner-v2 05) ------------------------------------------------

/** One day being edited: the Closed switch and its open–close ranges. */
export type DayDraft = { closed: boolean; ranges: Range[] };

const DEFAULT_RANGE: Range = { opens: "09:00", closes: "18:00" };

export function dayDraft(ranges: Range[]): DayDraft {
  return ranges.length > 0
    ? { closed: false, ranges: ranges.map((r) => ({ ...r })) }
    : { closed: true, ranges: [{ ...DEFAULT_RANGE }] };
}

/** The whole week with this one day replaced; set_opening_hours saves weeks atomically. */
export function applyDayDraft(week: Week, day: number, draft: DayDraft): Week {
  return { ...week, [day]: draft.closed ? [] : draft.ranges.map((r) => ({ ...r })) };
}

export function addBreak(ranges: Range[]): Range[] {
  return [...ranges, { opens: "", closes: "" }];
}

/** Why the day can't be saved, or undefined when it can. */
export function dayDraftError(week: Week, day: number, draft: DayDraft): string | undefined {
  return validateWeek(applyDayDraft(week, day, draft))[day];
}
