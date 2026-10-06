import { PHONE_ERROR, normalizeKenyanPhone } from "@bookflow/shared";
import { z } from "zod";

import { bookingSchema, type AgendaBooking } from "./agenda";
import { dayMonth, shortDate, zonedParts } from "./time";

/** Rules for Clients (owner-v4 03–05). The database works out visits and segments. */

export const SEGMENTS = ["all", "new", "regular", "lapsed"] as const;
export type Segment = (typeof SEGMENTS)[number];

/** "All", "New", "Regulars", "Lapsed" (04). */
export const SEGMENT_LABELS: Record<Segment, string> = {
  all: "All",
  new: "New",
  regular: "Regulars",
  lapsed: "Lapsed",
};

const clientItemSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  phone_verified: z.boolean(),
  visits: z.number().int(),
  last_visit: z.string().nullable(),
  next_booking: z.string().nullable(),
  avg_gap_days: z.number().nullable(),
  segments: z.array(z.enum(["new", "regular", "lapsed"])),
});

/** The shape returned by get_clients (supabase/migrations/20261004180000_calendar_and_clients.sql). */
const clientListSchema = z.object({
  counts: z.object({
    all: z.number(),
    new: z.number(),
    regular: z.number(),
    lapsed: z.number(),
  }),
  clients: z.array(clientItemSchema),
});

export type ClientItem = z.infer<typeof clientItemSchema>;
export type ClientList = z.infer<typeof clientListSchema>;

export function parseClientList(data: unknown): ClientList {
  return clientListSchema.parse(data);
}

/** The shape returned by get_client_profile. */
const profileSchema = z.object({
  client: z.object({
    id: z.string(),
    full_name: z.string(),
    phone: z.string().nullable(),
    phone_verified: z.boolean(),
    notes: z.string().nullable(),
    has_account: z.boolean(),
  }),
  stats: z.object({
    visits: z.number().int(),
    spent_kes: z.number().int(),
    avg_gap_days: z.number().nullable(),
    no_shows: z.number().int(),
  }),
  upcoming: bookingSchema.nullable(),
  past: z.array(bookingSchema),
});

export type ClientProfile = z.infer<typeof profileSchema>;

export function parseProfile(data: unknown): ClientProfile {
  return profileSchema.parse(data);
}

/** "All · 42", as on the segment chips. */
export function segmentChip(segment: Segment, counts: ClientList["counts"]): string {
  return `${SEGMENT_LABELS[segment]} · ${counts[segment]}`;
}

/** The badges after a name: New and Lapsed (04). */
export function clientBadges(client: ClientItem): ("new" | "lapsed")[] {
  return client.segments.filter((s): s is "new" | "lapsed" => s === "new" || s === "lapsed");
}

const visitsText = (n: number) => `${n} ${n === 1 ? "visit" : "visits"}`;

/** "6 weeks" or "10 days": how often the client usually comes, in words. */
export function usualEvery(days: number): string {
  const whole = Math.max(1, Math.round(days));
  if (whole < 14 && whole !== 7) return `${whole} ${whole === 1 ? "day" : "days"}`;
  const weeks = Math.round(whole / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

/** "14 Aug", with the year when it isn't this year. */
function visitDate(iso: string, timeZone: string, now: Date): string {
  const { date } = zonedParts(new Date(iso), timeZone);
  const thisYear = zonedParts(now, timeZone).date.slice(0, 4);
  return date.startsWith(thisYear) ? dayMonth(date) : `${dayMonth(date)} ${date.slice(0, 4)}`;
}

/**
 * The line under a name (04): the next booking first, then walk-ins without a phone, then a lapsed
 * client's usual rhythm, then the last visit.
 */
export function clientSubLine(client: ClientItem, timeZone: string, now: Date): string {
  if (client.next_booking) {
    return `Upcoming ${shortDate(client.next_booking, timeZone)} · ${visitsText(client.visits)}`;
  }
  if (!client.phone) {
    return client.visits > 0
      ? `Walk-in · ${visitsText(client.visits)} · no phone`
      : "Walk-in · no phone";
  }
  if (!client.last_visit) return "No visits yet";
  const last = `Last visit ${visitDate(client.last_visit, timeZone, now)}`;
  if (client.segments.includes("lapsed") && client.avg_gap_days !== null) {
    return `${last} · usually every ${usualEvery(client.avg_gap_days)}`;
  }
  return `${last} · ${visitsText(client.visits)}`;
}

// Sampled from owner-v4 04 and 05.
const CLIENT_TINTS = ["#F0A030", "#8A6FD1", "#1E7F4F", "#C98B67", "#5B45E0"];

/** A colour for the initials circle, fixed per client. */
export function clientTint(clientId: string): string {
  let hash = 0;
  for (const char of clientId) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return CLIENT_TINTS[hash % CLIENT_TINTS.length]!;
}

/** "Upcoming · Mon 5 Oct, 10:30" (05). */
export function upcomingTitle(booking: AgendaBooking, timeZone: string): string {
  const { time } = zonedParts(new Date(booking.starts_at), timeZone);
  return `Upcoming · ${shortDate(booking.starts_at, timeZone)}, ${time}`;
}

/** "14 Sep · with Njeri" under a past visit (05). */
export function pastVisitLine(booking: AgendaBooking, timeZone: string, now: Date): string {
  return `${visitDate(booking.starts_at, timeZone, now)} · with ${booking.staff_name}`;
}

/** Add or edit a client: why it can't be saved yet, or the values to save. */
export function clientFormResult(input: {
  name: string;
  phone: string;
}):
  | { ok: true; name: string; phone: string | null }
  | { ok: false; field: "name" | "phone"; message: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, field: "name", message: "Type the client's name." };
  if (name.length > 80)
    return { ok: false, field: "name", message: "Keep the name under 80 characters." };
  if (!input.phone.trim()) return { ok: true, name, phone: null };
  const phone = normalizeKenyanPhone(input.phone);
  if (!phone) {
    return {
      ok: false,
      field: "phone",
      message: PHONE_ERROR,
    };
  }
  return { ok: true, name, phone };
}

/** "That number already belongs to Wanjiru Otieno". */
export function duplicatePhoneMessage(name: string): string {
  return `That number already belongs to ${name}`;
}

/** Notes save once typing pauses; this long. */
export const NOTES_DEBOUNCE_MS = 800;
export const NOTES_MAX = 1000;
