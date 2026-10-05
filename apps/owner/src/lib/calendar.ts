import { z } from "zod";

import { bookingSchema, firstName, type AgendaBooking } from "./agenda";
import { addDays, dayMonth, isoWeekday, weekdayShort, zonedParts, zonedTime } from "./time";

/** Rules for the Calendar (owner-v4 01, 02). */

/** The shape returned by get_range_agenda (supabase/migrations/20261004180000_calendar_and_clients.sql). */
const rangeSchema = z.object({
  staff: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      photo_path: z.string().nullable(),
      sort_order: z.number(),
      active: z.boolean(),
    }),
  ),
  days: z.array(
    z.object({
      date: z.string(),
      open: z.array(z.object({ opens: z.string(), closes: z.string() })),
      bookings: z.array(bookingSchema),
      time_off: z.array(
        z.object({
          staff_id: z.string(),
          starts_at: z.string(),
          ends_at: z.string(),
          reason: z.string().nullable(),
        }),
      ),
    }),
  ),
});

export type RangeAgenda = z.infer<typeof rangeSchema>;
export type CalendarDay = RangeAgenda["days"][number];
export type CalendarStaff = RangeAgenda["staff"][number];
export type TimeOff = CalendarDay["time_off"][number];

export function parseRange(data: unknown): RangeAgenda {
  return rangeSchema.parse(data);
}

export const VIEWS = ["list", "day", "week"] as const;
export type CalendarView = (typeof VIEWS)[number];

export function isView(value: unknown): value is CalendarView {
  return typeof value === "string" && (VIEWS as readonly string[]).includes(value);
}

/** The Monday of the week holding a "YYYY-MM-DD" date. */
export function weekStart(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/** The dates the view loads: one day, or Monday to Sunday. */
export function rangeFor(view: CalendarView, date: string): { from: string; to: string } {
  if (view !== "week") return { from: date, to: date };
  const from = weekStart(date);
  return { from, to: addDays(from, 6) };
}

/** ‹ and › (and swipes): a day at a time, or a week at a time. */
export function shiftDate(view: CalendarView, date: string, direction: 1 | -1): string {
  return addDays(date, (view === "week" ? 7 : 1) * direction);
}

const at = (date: string) => zonedTime(date, "12:00", "UTC");

/** "Today · Sat 3 Oct", "Mon 5 Oct", or for a week "28 Sep – 4 Oct" (01, 02). */
export function headerLabel(view: CalendarView, date: string, today: string): string {
  if (view === "week") {
    const from = weekStart(date);
    return `${dayMonth(from)} – ${dayMonth(addDays(from, 6))}`;
  }
  const label = `${weekdayShort(date)} ${dayMonth(date)}`;
  return date === today ? `Today · ${label}` : label;
}

/** "Mon" and "28", for the week's column heads (02). */
export function weekdayHead(date: string): { weekday: string; day: string } {
  return { weekday: weekdayShort(date), day: String(Number(date.slice(8, 10))) };
}

// The time scale ----------------------------------------------------------------------------

/** Minutes after midnight of a "HH:MM" time. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Minutes into the date (in the zone) of an instant, clamped to the day. */
export function minuteOfDay(iso: string, date: string, timeZone: string): number {
  const parts = zonedParts(new Date(iso), timeZone);
  if (parts.date < date) return 0;
  if (parts.date > date) return 24 * 60;
  return toMinutes(parts.time);
}

export type Scale = { start: number; end: number };

/**
 * From the earliest opening to the latest closing of the days shown, widened to whole hours and to
 * any booking or time off outside the hours. 09:00–18:00 when nothing is open.
 */
export function scaleFor(days: CalendarDay[], timeZone: string): Scale {
  let start = Infinity;
  let end = -Infinity;
  for (const day of days) {
    for (const w of day.open) {
      start = Math.min(start, toMinutes(w.opens));
      end = Math.max(end, toMinutes(w.closes));
    }
  }
  if (start === Infinity) {
    start = 9 * 60;
    end = 18 * 60;
  }
  for (const day of days) {
    for (const b of day.bookings) {
      start = Math.min(start, minuteOfDay(b.starts_at, day.date, timeZone));
      end = Math.max(end, minuteOfDay(b.ends_at, day.date, timeZone));
    }
  }
  return {
    start: Math.max(0, Math.floor(start / 60) * 60),
    end: Math.min(24 * 60, Math.ceil(end / 60) * 60),
  };
}

/** "09:00", "10:00", … for each hour line on the scale. */
export function hourMarks(scale: Scale): string[] {
  const marks: string[] = [];
  for (let m = scale.start; m < scale.end; m += 60) marks.push(fromMinutes(m));
  return marks;
}

/** Where a span sits on the scale, in points: `hour` points per hour. */
export function placeOnScale(
  from: number,
  to: number,
  scale: Scale,
  hour: number,
): { top: number; height: number } | undefined {
  const start = Math.max(from, scale.start);
  const end = Math.min(to, scale.end);
  if (end <= start) return undefined;
  return { top: ((start - scale.start) / 60) * hour, height: ((end - start) / 60) * hour };
}

/** A tap at `y` points down the scale → the nearest 15-minute time, kept on the scale. */
export function timeAt(y: number, scale: Scale, hour: number): string {
  const raw = scale.start + (Number.isFinite(y) ? y / hour : 0) * 60;
  const snapped = Math.round(raw / 15) * 15;
  return fromMinutes(Math.min(Math.max(snapped, scale.start), scale.end - 15));
}

/** The now-line's minute on today's column, or undefined on other days or off the scale. */
export function nowMinute(
  date: string,
  now: Date,
  timeZone: string,
  scale: Scale,
): number | undefined {
  const parts = zonedParts(now, timeZone);
  if (parts.date !== date) return undefined;
  const minute = toMinutes(parts.time);
  return minute >= scale.start && minute <= scale.end ? minute : undefined;
}

// Blocks ------------------------------------------------------------------------------------

export type BlockTone = "done" | "next" | "upcoming" | "noShow";

/** Green completed, amber next, blue upcoming, grey no-show (01). */
export function blockTone(booking: AgendaBooking, nextId: string | undefined): BlockTone {
  if (booking.status === "completed") return "done";
  if (booking.status === "no_show") return "noShow";
  return booking.id === nextId ? "next" : "upcoming";
}

/** "Brian K." on a block; "Walk-in" without a client. */
export function blockName(booking: AgendaBooking): string {
  if (!booking.client) return "Walk-in";
  const words = booking.client.full_name.trim().split(/\s+/);
  const first = firstName(booking.client.full_name);
  const last = words.length > 1 ? Array.from(words[words.length - 1]!)[0] : undefined;
  return last ? `${first} ${last.toUpperCase()}.` : first;
}

/** Day-view blocks shorter than 45 minutes show "Name · service" on one line (owner-v6 05). */
export function isShortBlock(booking: Pick<AgendaBooking, "starts_at" | "ends_at">): boolean {
  return Date.parse(booking.ends_at) - Date.parse(booking.starts_at) < 45 * 60_000;
}

/** "Box braids", or "Wash & set, trim" for several services. */
export function blockServices(booking: AgendaBooking): string {
  return booking.services
    .map((s, i) => (i === 0 ? s.name : s.name.charAt(0).toLowerCase() + s.name.slice(1)))
    .join(", ");
}

/** "Off until 12:00", or "Training until 16:00"; just the label when it runs past the day. */
export function timeOffLabel(off: TimeOff, date: string, timeZone: string): string {
  const label = off.reason?.trim() || "Off";
  const end = zonedParts(new Date(off.ends_at), timeZone);
  return end.date === date ? `${label} until ${end.time}` : label;
}

/** The people with a column: active team members, in their order. */
export function columnsFor(staff: CalendarStaff[]): CalendarStaff[] {
  return staff.filter((s) => s.active);
}

/** A day's bookings for the week's staff filter (null = Everyone). */
export function bookingsFor(day: CalendarDay, staffId: string | null): AgendaBooking[] {
  return staffId ? day.bookings.filter((b) => b.staff_id === staffId) : day.bookings;
}

export const isClosed = (day: CalendarDay) => day.open.length === 0;

/** The month grid of the date picker: weeks of seven dates (Monday first), null outside the month. */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month.slice(0, 7)}-01`;
  const lead = isoWeekday(first) - 1;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "October 2026". */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(at(`${month.slice(0, 7)}-01`));
}

/** The first of the month before or after. */
export function shiftMonth(month: string, direction: 1 | -1): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + direction, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Side-by-side lanes for bookings that overlap in one column (the week's Everyone view): each
 * booking's lane and how many lanes its cluster of overlaps needs.
 */
export function lanes(bookings: AgendaBooking[]): Map<string, { lane: number; of: number }> {
  const sorted = [...bookings].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id),
  );
  const out = new Map<string, { lane: number; of: number }>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const close = () => {
    for (const c of cluster) out.set(c.id, { lane: c.lane, of: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const b of sorted) {
    const start = Date.parse(b.starts_at);
    const end = Date.parse(b.ends_at);
    if (start >= clusterEnd) close();
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) lane = laneEnds.push(end) - 1;
    else laneEnds[lane] = end;
    cluster.push({ id: b.id, lane });
    clusterEnd = Math.max(clusterEnd === -Infinity ? end : clusterEnd, end);
  }
  close();
  return out;
}
