import { formatKenyanPhone } from "@bookflow/shared";
import { z } from "zod";

import { ceilToMinutes } from "./time";

/** The shape returned by get_day_agenda (supabase/migrations/20261004150000_owner_today.sql). */
const bookingSchema = z.object({
  id: z.string(),
  status: z.enum(["confirmed", "completed", "no_show"]),
  starts_at: z.string(),
  ends_at: z.string(),
  source: z.enum(["web", "owner"]),
  is_new: z.boolean(),
  staff_id: z.string(),
  staff_name: z.string(),
  total_kes: z.number().int(),
  client: z
    .object({
      id: z.string(),
      full_name: z.string(),
      phone: z.string().nullable(),
      phone_verified: z.boolean(),
      visit_number: z.number().int(),
    })
    .nullable(),
  services: z.array(
    z.object({ name: z.string(), duration_min: z.number(), price_kes: z.number() }),
  ),
});

const gapSchema = z.object({ starts_at: z.string(), ends_at: z.string(), minutes: z.number() });

const agendaSchema = z.object({
  date: z.string(),
  stats: z.object({ booked: z.number(), expected_kes: z.number(), free_min: z.number() }),
  bookings: z.array(bookingSchema),
  gaps: z.array(gapSchema),
});

export type Agenda = z.infer<typeof agendaSchema>;
export type AgendaBooking = z.infer<typeof bookingSchema>;
export type Gap = z.infer<typeof gapSchema>;

export function parseAgenda(data: unknown): Agenda {
  return agendaSchema.parse(data);
}

const at = (iso: string) => new Date(iso).getTime();

export type Row = { kind: "booking"; booking: AgendaBooking } | { kind: "gap"; gap: Gap };

/** Bookings and free gaps in one list, in time order (01). */
export function timeline(agenda: Agenda): Row[] {
  const rows: Row[] = [
    ...agenda.bookings.map((booking) => ({ kind: "booking" as const, booking })),
    ...agenda.gaps.map((gap) => ({ kind: "gap" as const, gap })),
  ];
  const start = (row: Row) =>
    at(row.kind === "booking" ? row.booking.starts_at : row.gap.starts_at);
  return rows.sort((a, b) => start(a) - start(b));
}

/** The first confirmed booking that hasn't ended yet: it gets the Next badge. */
export function nextBookingId(bookings: AgendaBooking[], now: Date): string | undefined {
  return bookings.find((b) => b.status === "confirmed" && at(b.ends_at) > now.getTime())?.id;
}

export type CardBadge = "done" | "next" | "new" | "noShow" | "unverified";

/** The badges on a card, in the mockup's order. */
export function badgesFor(booking: AgendaBooking, nextId: string | undefined): CardBadge[] {
  const badges: CardBadge[] = [];
  if (booking.status === "completed") badges.push("done");
  if (booking.status === "no_show") badges.push("noShow");
  if (booking.id === nextId) badges.push("next");
  if (booking.is_new) badges.push("new");
  // A walk-in without a phone has nothing to verify.
  if (booking.client?.phone && !booking.client.phone_verified) badges.push("unverified");
  return badges;
}

/** The coloured bar on the card's left: green when done, amber for Next, grey otherwise. */
export function barTone(
  booking: AgendaBooking,
  nextId: string | undefined,
): "done" | "next" | "idle" {
  if (booking.status === "completed") return "done";
  return booking.id === nextId ? "next" : "idle";
}

/**
 * What an opened card offers. Mark done and No-show only once the booking has started; Cancel any
 * time while it's confirmed. Owners do everything; staff mark their own bookings only (the
 * database decides again in update_booking_status).
 */
export function actionsFor(
  booking: AgendaBooking,
  now: Date,
  viewer: { isOwner: boolean; staffId: string | null },
): { markDone: boolean; noShow: boolean; cancel: boolean } {
  if (booking.status !== "confirmed") return { markDone: false, noShow: false, cancel: false };
  const started = now.getTime() >= at(booking.starts_at);
  const mayMark = viewer.isOwner || booking.staff_id === viewer.staffId;
  return { markDone: started && mayMark, noShow: started && mayMark, cancel: viewer.isOwner };
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 22 → "22nd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th");
  return `${n}${suffix}`;
}

/** "3rd visit · booked online" (02). */
export function visitLine(booking: AgendaBooking): string {
  const how = booking.source === "web" ? "booked online" : "added by you";
  const visit = Math.max(1, booking.client?.visit_number ?? 1);
  return `${ordinal(visit)} visit · ${how}`;
}

/** "Box braids · with Njeri", or "Wash & set, trim · with Njeri" for several services. */
export function serviceLine(booking: AgendaBooking): string {
  const names = booking.services.map((s, i) =>
    i === 0 ? s.name : s.name.charAt(0).toLowerCase() + s.name.slice(1),
  );
  return `${names.join(", ")} · with ${booking.staff_name}`;
}

export function durationMinutes(booking: AgendaBooking): number {
  return Math.round((at(booking.ends_at) - at(booking.starts_at)) / 60_000);
}

/** "3,500": card amounts drop the KES prefix (01). */
export function amount(kes: number): string {
  return String(kes).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function telLink(phone: string): string {
  return `tel:${phone}`;
}

/** wa.me wants the number without the plus. */
export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/^\+/, "")}`;
}

export function localPhone(phone: string | null | undefined): string {
  return phone ? formatKenyanPhone(phone) : "";
}

/**
 * Where the + button starts a new booking: the first 15-minute mark from now that sits in a free
 * gap with room for at least 15 minutes, or else simply the next 15-minute mark.
 */
export function nextFreeSlot(gaps: Gap[], now: Date): Date {
  for (const gap of gaps) {
    const start = ceilToMinutes(new Date(Math.max(at(gap.starts_at), now.getTime())), 15);
    if (start.getTime() + 15 * 60_000 <= at(gap.ends_at)) return start;
  }
  return ceilToMinutes(now, 15);
}
