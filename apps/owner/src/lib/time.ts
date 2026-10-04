/** Time in the salon's zone, without a date library: Intl reads the zone, plain maths does the rest. */

const MINUTE = 60_000;

function parts(date: Date, timeZone: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

/** The wall-clock date and time in the zone: { date: "2026-10-03", time: "09:05" }. */
export function zonedParts(date: Date, timeZone: string): { date: string; time: string } {
  const p = parts(date, timeZone);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** "09:05": the 24-hour clock the Today mockups use. */
export function clockTime(at: Date | string, timeZone: string): string {
  return zonedParts(new Date(at), timeZone).time;
}

/** "Sat 3 Oct". */
export function shortDate(at: Date | string, timeZone: string): string {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(new Date(at));
  return `${format({ weekday: "short" })} ${format({ day: "numeric", month: "short" })}`;
}

/** The instant a wall-clock date and time ("2026-10-03", "12:00") happens in the zone. */
export function zonedTime(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  // Guess, then correct by the zone's offset at the guess; twice settles DST edges.
  let at = wanted;
  for (let i = 0; i < 2; i++) {
    const seen = zonedParts(new Date(at), timeZone);
    const [sy, sm, sd] = seen.date.split("-").map(Number) as [number, number, number];
    const [sh, smin] = seen.time.split(":").map(Number) as [number, number];
    at += wanted - Date.UTC(sy, sm - 1, sd, sh, smin);
  }
  return new Date(at);
}

/** Rounds up to the next whole step of minutes (zones are whole quarter hours from UTC). */
export function ceilToMinutes(at: Date, step: number): Date {
  const ms = step * MINUTE;
  return new Date(Math.ceil(at.getTime() / ms) * ms);
}

export function addMinutes(at: Date, minutes: number): Date {
  return new Date(at.getTime() + minutes * MINUTE);
}

/** ISO weekday, Monday = 1, of a "YYYY-MM-DD" date (the opening_hours numbering). */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** "2026-10-03" plus n days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
