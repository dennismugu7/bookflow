import { z } from 'zod';

/**
 * The bookings contract (ADR-014, ADR-025).
 *
 * ══ TIMES ARE AFRICA/NAIROBI, AND THE ASSUMPTION IS LOAD-BEARING ════════════
 *
 * ADR-005 makes the timezone an application constant rather than a stored
 * column: v1 is Kenya, and there is no per-business timezone anywhere in the
 * schema. So:
 *
 *   * `opening_hours` is a plain local time with no offset. `09:00` means nine
 *     in the morning in Nairobi and cannot mean anything else.
 *   * `bookings.starts_at` is a `timestamptz` — a real instant, stored in UTC.
 *   * **The conversion between them happens in one place**, `SALON_TIME_ZONE`
 *     below, and is done by PostgreSQL rather than by JavaScript. `Date` in
 *     Node carries the SERVER's zone, and a slot computed in a container set to
 *     UTC would be three hours out from one set to Africa/Nairobi. The database
 *     knows the rule; the process does not.
 *
 * Kenya has never observed daylight saving and UTC+3 has not moved since 1960,
 * so no slot in this system has ever had to survive a clock change. That is
 * luck rather than design, and it is why the conversion is delegated to
 * `AT TIME ZONE` instead of being an addition of three hours somewhere.
 */
export const SALON_TIME_ZONE = 'Africa/Nairobi';

/** The grid the design's booking flow offers. */
export const SLOT_MINUTES = 30;

/**
 * How far ahead a client may book.
 *
 * A8 — "how far ahead can a client book" — is undecided, and this answers it
 * only for the availability endpoint's input validation. Sixty days is the
 * brief's number; nothing downstream depends on it, and a real answer belongs
 * in a business setting rather than a constant.
 */
export const MAX_BOOKING_HORIZON_DAYS = 60;

/** `YYYY-MM-DD`, a calendar date in the salon's zone. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .describe('A date in the salon’s local calendar (Africa/Nairobi).');

export const availabilityQuerySchema = z
  .object({
    serviceId: z.uuid(),
    date: isoDate,
    /**
     * Absent means "any professional", and that is not the same question as
     * naming someone: it asks whether the SALON is free, which is how the
     * exclusion constraint treats a booking with no team member.
     */
    teamMemberId: z.uuid().optional(),
  })
  .describe('Which service, which day, and optionally with whom.');

export const availabilitySchema = z
  .object({
    slots: z
      .array(z.string())
      .describe('Start times as HH:MM, local. Empty when nothing is free.'),
  })
  .describe('The bookable start times for one service on one day.')
  .meta({ id: 'Availability' });

/**
 * What a client gets back after booking.
 *
 * ── AN ALLOWLIST, LIKE THE PUBLIC SALON PAGE ───────────────────────────────
 *
 * This is an unauthenticated response, so the same rule applies as to
 * `public.schema.ts`: it names what it emits. No owner data, no business id, no
 * team-member id, no other bookings — a stranger who books a haircut learns
 * that their booking exists and nothing about the salon's diary.
 *
 * The id is here because the client needs it. ADR-019 will pair it with an
 * opaque booking token for cancel and review; that token does not exist yet and
 * **the id alone is not a capability** — nothing in this API accepts it from an
 * unauthenticated caller.
 */
export const bookingReceiptSchema = z
  .object({
    id: z.uuid(),
    serviceName: z.string(),
    durationMinutes: z.int(),
    priceKes: z.int().describe('Whole Kenyan shillings.'),
    startsAt: z.string().describe('ISO 8601 instant, UTC.'),
    status: z.string(),
  })
  .describe('Confirmation of a booking, as the person who made it sees it.')
  .meta({ id: 'BookingReceipt' });

const bookingStatuses = ['booked', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const ownerBookingSchema = z
  .object({
    id: z.uuid(),
    /** ADR-006: the SNAPSHOT, never a join. What the client actually agreed to. */
    serviceName: z.string(),
    durationMinutes: z.int(),
    priceKes: z.int(),
    /** Null when the service has since been deleted. Reporting only. */
    serviceId: z.uuid().nullable(),
    /** Null means the booking was made as "any professional". */
    teamMemberId: z.uuid().nullable(),
    teamMemberName: z.string().nullable(),
    clientName: z.string(),
    clientEmail: z.string(),
    clientPhone: z.string(),
    startsAt: z.string(),
    status: z.enum(bookingStatuses),
    /**
     * ADR-011: the object is in the PRIVATE bucket and this value confers no
     * access. Serving it needs an authorizing endpoint returning a short-lived
     * signed URL, which does not exist yet — so a client that renders this as
     * an `<img src>` will get nothing.
     */
    paymentProofUrl: z.string().nullable(),
  })
  .describe('A booking, as the salon owner sees it.')
  .meta({ id: 'OwnerBooking' });

export const ownerBookingsSchema = z
  .array(ownerBookingSchema)
  .describe('The salon’s bookings, soonest-starting last.');

export const bookingsQuerySchema = z
  .object({ status: z.enum(bookingStatuses).optional() })
  .describe('Optionally filtered by status.');

export const contactSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    bookingCount: z.int(),
    lastBookingAt: z.string(),
  })
  .describe('Someone who has booked, derived from bookings.')
  .meta({ id: 'Contact' });

export const contactsSchema = z
  .array(contactSchema)
  .describe('The salon’s clients, most recent first.');
