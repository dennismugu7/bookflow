import { WEEKDAYS, validateWeek, type Range, type Week } from "./setup";

/** "Xenon Xavier" → "XX"; an email uses the part before "@" ("amina.said@…" → "AS"). */
export function initials(text: string): string {
  const words = text
    .split("@")[0]!
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** "20 mins", as on the service cards (49). */
export function minutesLabel(minutes: number): string {
  return minutes === 1 ? "1 min" : `${minutes} mins`;
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

/** "10:00 - 24:00", ranges joined by commas, or "Closed" (57). */
export function hoursLabel(ranges: Range[]): string {
  if (ranges.length === 0) return "Closed";
  return ranges.map((r) => `${r.opens} - ${r.closes}`).join(", ");
}

/** One editable "Day : open - close" line of the hours editor (56). */
export type HourRow = { day: number | null; opens: string; closes: string };

const isBlank = (row: HourRow) => row.day === null && !row.opens.trim() && !row.closes.trim();

export function weekToHourRows(week: Week): HourRow[] {
  return WEEKDAYS.flatMap(({ day }) =>
    [...(week[day] ?? [])]
      .sort((a, b) => a.opens.localeCompare(b.opens))
      .map((r) => ({ day, opens: r.opens, closes: r.closes })),
  );
}

/** Back to a week; blank rows are dropped and days without rows are closed. */
export function hourRowsToWeek(rows: HourRow[]): Week {
  const week: Week = Object.fromEntries(WEEKDAYS.map(({ day }) => [day, [] as Range[]]));
  for (const row of rows) {
    if (row.day === null) continue;
    week[row.day]?.push({ opens: row.opens, closes: row.closes });
  }
  for (const { day } of WEEKDAYS) week[day]!.sort((a, b) => a.opens.localeCompare(b.opens));
  return week;
}

/** Errors by row index; a day's error (validateWeek) shows on each of that day's rows. */
export function validateHourRows(rows: HourRow[]): Record<number, string> {
  const errors: Record<number, string> = {};
  rows.forEach((row, index) => {
    if (row.day === null && !isBlank(row)) errors[index] = "Pick a day.";
  });
  const dayErrors = validateWeek(hourRowsToWeek(rows));
  rows.forEach((row, index) => {
    if (row.day !== null && dayErrors[row.day]) errors[index] = dayErrors[row.day]!;
  });
  return errors;
}
