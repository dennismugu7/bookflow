import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import { MailError, type Mail, type Mailer } from '../../platform/resend.ts';
import type { OwnerScope } from '../scope.ts';
import {
  availableSlots,
  minutesOf,
  type Busy,
  type Window,
} from './availability.ts';
import {
  cancelledMail,
  confirmedMail,
  reinstatedMail,
  type BookingMailFacts,
} from './bookings.email.ts';
import {
  findBookingStatus,
  findOccupiedRanges,
  findOpeningWindows,
  findPublishedSalonId,
  findServiceForBusiness,
  insertBooking,
  isSlotTaken,
  listBookings,
  listContacts,
  teamMemberBelongsTo,
  transitionBooking,
  type ContactRow,
  type InsertedBookingRow,
  type OwnerBookingRow,
} from './bookings.repository.ts';
import {
  MAX_BOOKING_HORIZON_DAYS,
  SALON_TIME_ZONE,
  type BookingStatus,
} from './bookings.schema.ts';

/** Business logic. All of it. Routes hold none and repositories hold no rules. */

export interface BookingLogger {
  warn(payload: Record<string, unknown>, message: string): void;
}

/**
 * Today, as a calendar date in the salon's zone.
 *
 * ── `Intl`, NOT `toISOString` ──────────────────────────────────────────────
 *
 * `new Date().toISOString().slice(0, 10)` is the obvious version and it is
 * wrong for three hours of every day: at 01:00 in Nairobi it is still
 * yesterday in UTC, so "today" would be a past date and every slot on it would
 * be refused. `en-CA` formats as `YYYY-MM-DD`, which is the shape the query
 * needs.
 */
function todayInSalonZone(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Minutes since local midnight, in the salon's zone. */
function minutesNowInSalonZone(now: Date): number {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  return minutesOf(formatted);
}

/** The published salon behind a handle, or a 404. */
async function requireSalon(
  db: Executor,
  handle: string,
): Promise<{ businessId: string; name: string }> {
  const salon = await findPublishedSalonId(db, handle);
  if (salon === undefined) {
    // "No such handle" and "not published" are one answer, deliberately: the
    // public projection makes the same conflation, and distinguishing them
    // would let anyone enumerate unpublished salons by name.
    throw new ProblemError('not-found', 'no published salon at that handle');
  }
  return salon;
}

/**
 * The bookable start times for one service on one day.
 *
 * ── THE DATE BOUNDS ARE VALIDATION, NOT AVAILABILITY ───────────────────────
 *
 * A past date and a date beyond the horizon are `validation-failed` rather than
 * an empty slot list. An empty list means "that day is full"; a 400 means "that
 * is not a day you may ask about", and a client that could not tell them apart
 * would show "fully booked" for a date typed wrongly.
 */
export async function getAvailability(
  db: Executor,
  input: {
    readonly handle: string;
    readonly serviceId: string;
    readonly date: string;
    readonly teamMemberId: string | undefined;
    readonly now: Date;
  },
): Promise<{ slots: string[] }> {
  const today = todayInSalonZone(input.now);

  if (input.date < today) {
    throw new ProblemError('validation-failed', 'date is in the past');
  }

  const horizon = new Date(input.now.getTime());
  horizon.setUTCDate(horizon.getUTCDate() + MAX_BOOKING_HORIZON_DAYS);
  if (input.date > todayInSalonZone(horizon)) {
    throw new ProblemError('validation-failed', 'date is beyond the horizon');
  }

  const salon = await requireSalon(db, input.handle);

  const service = await findServiceForBusiness(
    db,
    salon.businessId,
    input.serviceId,
  );
  if (service === undefined) {
    throw new ProblemError('not-found', 'no such service for this salon');
  }

  if (
    input.teamMemberId !== undefined &&
    !(await teamMemberBelongsTo(db, salon.businessId, input.teamMemberId))
  ) {
    throw new ProblemError('not-found', 'no such team member for this salon');
  }

  const windows: Window[] = (
    await findOpeningWindows(db, salon.businessId, input.date)
  ).map((row) => ({
    openMinutes: minutesOf(row.openTime),
    closeMinutes: minutesOf(row.closeTime),
  }));

  // A closed day has no rows (A6), so there is nothing to offer and no query
  // worth running against the bookings table.
  if (windows.length === 0) return { slots: [] };

  const occupied = await findOccupiedRanges(db, {
    businessId: salon.businessId,
    date: input.date,
    teamMemberId: input.teamMemberId,
  });

  // Only the parts that fall on the requested day matter to the grid; a
  // booking that spills over from yesterday is clamped to this morning rather
  // than dropped, which is what stops it being offered twice.
  const busy: Busy[] = occupied.map((row) => ({
    startMinutes: localMinutesOn(row.startsAt, input.date, -1),
    endMinutes: localMinutesOn(row.endsAt, input.date, 1),
  }));

  return {
    slots: availableSlots({
      windows,
      busy,
      durationMinutes: service.durationMinutes,
      // Only today needs a floor. A future date's every slot is still ahead,
      // and applying the current time to it would hide the morning.
      notBeforeMinutes:
        input.date === today ? minutesNowInSalonZone(input.now) : undefined,
    }),
  };
}

/**
 * `2026-08-22T14:30` → minutes since midnight ON `date`.
 *
 * A booking that begins the day before is clamped to the start of the day
 * (`before`), one that ends the day after to the end (`after`) — expressed as
 * a large sentinel so the overlap test still refuses the whole morning or
 * evening. Not dropped: a booking running from 23:00 to 01:00 occupies an hour
 * of the requested day and forgetting it would offer a slot the constraint
 * then refuses.
 */
function localMinutesOn(
  stamp: string,
  date: string,
  direction: -1 | 1,
): number {
  const [day, clock] = stamp.split('T');
  if (day === date) return minutesOf(clock ?? '00:00');
  // Before the day, or after it.
  return (day ?? '') < date ? (direction === -1 ? -10_000 : 0) : 10_000;
}

/**
 * Creates a booking.
 *
 * ══ NO AVAILABILITY CHECK HERE, AND THAT IS THE RULE ════════════════════════
 *
 * `CLAUDE.md` §5: conflicts are enforced by the exclusion constraint and never
 * "re-implemented or pre-checked as the authority in application code". Two
 * clients booking the same slot in the same second both pass any check this
 * could make; the database refuses the second, and `isSlotTaken` turns that
 * into a 409 the client can act on.
 *
 * The service IS re-read and the snapshot taken from the ROW rather than from
 * anything the client sent (ADR-006). A price in the request body would be a
 * price the client chose.
 */
export async function createBooking(
  db: Executor,
  input: {
    readonly handle: string;
    readonly serviceId: string;
    readonly teamMemberId: string | undefined;
    readonly clientName: string;
    readonly clientEmail: string;
    readonly clientPhone: string;
    readonly startsAt: string;
    readonly paymentProofUrl: string | undefined;
  },
): Promise<InsertedBookingRow> {
  const salon = await requireSalon(db, input.handle);

  const service = await findServiceForBusiness(
    db,
    salon.businessId,
    input.serviceId,
  );
  if (service === undefined) {
    throw new ProblemError('not-found', 'no such service for this salon');
  }

  if (
    input.teamMemberId !== undefined &&
    !(await teamMemberBelongsTo(db, salon.businessId, input.teamMemberId))
  ) {
    throw new ProblemError('not-found', 'no such team member for this salon');
  }

  let created: InsertedBookingRow | undefined;
  try {
    created = await insertBooking(db, {
      businessId: salon.businessId,
      serviceId: service.id,
      teamMemberId: input.teamMemberId,
      // The snapshot, from the row. ADR-006.
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      priceKes: service.priceKes,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      startsAt: input.startsAt,
      paymentProofUrl: input.paymentProofUrl,
    });
  } catch (error) {
    if (isSlotTaken(error)) {
      throw new ProblemError('slot-taken', 'the slot was taken concurrently');
    }
    throw error;
  }

  if (created === undefined) {
    throw new Error('booking insert returned no row');
  }
  return created;
}

export async function getBookings(
  db: Executor,
  scope: OwnerScope,
  status: BookingStatus | undefined,
): Promise<OwnerBookingRow[]> {
  return await listBookings(db, scope, status);
}

export async function getContacts(
  db: Executor,
  scope: OwnerScope,
): Promise<ContactRow[]> {
  return await listContacts(db, scope);
}

/** Which statuses each action may move a booking out of. */
const TRANSITIONS = {
  confirm: { from: ['booked'], to: 'confirmed' },
  cancel: { from: ['booked', 'confirmed'], to: 'cancelled' },
  // A cancelled booking occupies nothing, so its slot may have been taken
  // while it was cancelled — the exclusion constraint is re-evaluated on this
  // update and may refuse it. That is a 409 `slot-taken`, not an error.
  reinstate: { from: ['cancelled'], to: 'booked' },
} as const satisfies Record<
  string,
  { from: readonly BookingStatus[]; to: BookingStatus }
>;

export type BookingAction = keyof typeof TRANSITIONS;

/**
 * Moves a booking, then tells the client.
 *
 * ══ THE MAIL IS SENT AFTER THE WRITE, AND NEVER FAILS THE REQUEST ═══════════
 *
 * `DEFINITION_OF_DONE.md`'s rule, and it decides the ordering: the status
 * change is committed first and the send is best-effort afterwards. A provider
 * outage must not roll back a cancellation the owner has already made — the
 * appointment IS cancelled, the salon has acted on it, and a 500 would invite
 * them to cancel it again.
 *
 * So a failed send logs a warning and returns success. The cost is a client who
 * is not told, and that cost is smaller than the alternative in every case.
 *
 * **This is not the ADR-012 outbox**, which would make the send retryable
 * rather than merely non-fatal. `resend.ts` records why, at length: the outbox
 * worker does not exist, and building it is a second feature.
 */
export async function actOnBooking(
  deps: {
    readonly db: Executor;
    readonly mailer: Mailer;
    readonly log: BookingLogger;
    readonly salonName: string;
  },
  scope: OwnerScope,
  bookingId: string,
  action: BookingAction,
): Promise<OwnerBookingRow> {
  const transition = TRANSITIONS[action];

  let moved: OwnerBookingRow | undefined;
  try {
    moved = await transitionBooking(
      deps.db,
      scope,
      bookingId,
      transition.from,
      transition.to,
    );
  } catch (error) {
    if (isSlotTaken(error)) {
      throw new ProblemError(
        'slot-taken',
        'the slot was taken while this booking was cancelled',
      );
    }
    throw error;
  }

  if (moved === undefined) {
    // The update matched nothing, which is two situations. The read below tells
    // them apart FOR THE RESPONSE ONLY — the guard is the update's own `where`,
    // so this cannot reintroduce a race.
    const current = await findBookingStatus(deps.db, scope, bookingId);
    if (current === undefined) {
      throw new ProblemError('not-found', 'no such booking for this user');
    }
    throw new ProblemError(
      'invalid-booking-transition',
      `cannot ${action} a booking that is ${current.status}`,
    );
  }

  await notify(deps, action, moved);
  return moved;
}

async function notify(
  deps: {
    readonly mailer: Mailer;
    readonly log: BookingLogger;
    readonly salonName: string;
  },
  action: BookingAction,
  booking: OwnerBookingRow,
): Promise<void> {
  const facts: BookingMailFacts = {
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    salonName: deps.salonName,
    serviceName: booking.serviceName,
    startsAt: new Date(booking.startsAt),
  };

  const mail: Mail = {
    confirm: confirmedMail,
    cancel: cancelledMail,
    reinstate: reinstatedMail,
  }[action](facts);

  try {
    await deps.mailer.send(mail);
  } catch (error) {
    // Swallowed on purpose. See `actOnBooking`. The recipient is logged and the
    // BODY is not: it carries a named person's appointment.
    deps.log.warn(
      {
        bookingId: booking.id,
        action,
        failure: error instanceof MailError ? error.failure : 'unknown',
        detail: error instanceof Error ? error.message : 'unknown error',
      },
      'booking status changed but the client was not emailed',
    );
  }
}
