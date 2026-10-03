export type HoursRow = { weekday: number; opens: string; closes: string };

export type OpenStatus =
  { open: true; until: string } | { open: false; next: { weekday: number; time: string } | null };

/** "09:00:00" or "24:00" → minutes after midnight (24:00 = 1440). */
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const hhmm = (time: string) => time.slice(0, 5);

/** ISO weekday (1 = Monday) and minutes after midnight, in the salon's timezone. */
function salonClock(now: Date, timeZone: string): { weekday: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { weekday, minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Whether the salon is open right now in its own timezone, and until when; otherwise when it next
 * opens (later today or on a following day), or null when it has no opening hours at all.
 */
export function openStatus(hours: HoursRow[], now: Date, timeZone: string): OpenStatus {
  const { weekday, minute } = salonClock(now, timeZone);
  const day = (d: number) =>
    hours.filter((h) => h.weekday === d).sort((a, b) => minutes(a.opens) - minutes(b.opens));

  const current = day(weekday).find(
    (h) => minutes(h.opens) <= minute && minute < minutes(h.closes),
  );
  if (current) return { open: true, until: hhmm(current.closes) };

  const laterToday = day(weekday).find((h) => minutes(h.opens) > minute);
  if (laterToday) return { open: false, next: { weekday, time: hhmm(laterToday.opens) } };

  // Up to a week ahead, including the same weekday next week.
  for (let offset = 1; offset <= 7; offset++) {
    const d = ((weekday - 1 + offset) % 7) + 1;
    const first = day(d)[0];
    if (first) return { open: false, next: { weekday: d, time: hhmm(first.opens) } };
  }
  return { open: false, next: null };
}

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The two parts of the status line: "Open" + "until 18:00", or "Closed" + "opens Mon 09:00". */
export function describeOpenStatus(
  status: OpenStatus,
  todayWeekday: number,
): { label: string; detail: string } {
  if (status.open) return { label: "Open", detail: `until ${status.until}` };
  if (!status.next) return { label: "Closed", detail: "" };
  const day = status.next.weekday === todayWeekday ? "today" : SHORT_DAYS[status.next.weekday - 1];
  return { label: "Closed", detail: `opens ${day} ${status.next.time}` };
}
