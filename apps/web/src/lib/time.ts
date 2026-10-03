/** Date and time helpers that always work in the salon's timezone, never the phone's. */

/** "10:30 am" in the salon's timezone. */
export function formatTime(iso: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value ?? "")
    .toLowerCase()
    .replace(/\./g, "");
  return `${hour}:${minute} ${period}`;
}

/** "Saturday, 10 October" in the salon's timezone, built from parts so every runtime agrees. */
export function formatLongDate(iso: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")}`;
}

/** The salon's calendar date ("2026-10-03") for an instant. */
export function salonDate(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Adds whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type Day = { date: string; weekday: string; dayOfMonth: string; month: string };

/** The next `count` days in the salon's timezone, starting today. */
// Built once: creating Intl formatters is slow on low-end phones, and the strip needs 28 labels.
const WEEKDAY_UTC = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const MONTH_UTC = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export function dayStrip(now: Date, timeZone: string, count = 14): Day[] {
  const today = salonDate(now, timeZone);
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    const noonUtc = new Date(`${date}T12:00:00Z`);
    return {
      date,
      weekday: i === 0 ? "Today" : WEEKDAY_UTC.format(noonUtc),
      dayOfMonth: String(Number(date.slice(8, 10))),
      month: MONTH_UTC.format(noonUtc),
    };
  });
}

/** ISO weekday of a "YYYY-MM-DD" date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** "m:ss" left on a hold, never negative. */
export function countdown(expiresAt: string | Date, now: Date): { seconds: number; label: string } {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000));
  return { seconds, label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` };
}

/** "45 min", "1h", "2h 15m". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest} mins`;
}
