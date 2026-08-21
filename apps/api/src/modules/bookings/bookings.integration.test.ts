import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  accountWithBusiness,
  type AccountWithBusiness,
} from '../../../test/integration/accounts.ts';
import { useTransaction } from '../../../test/integration/harness.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { Mail, Mailer } from '../../platform/resend.ts';
import { setOpeningHours } from '../hours/hours.service.ts';
import { addService } from '../services/services.service.ts';
import { publishMyBusiness } from '../publishing/publishing.service.ts';
import { availableSlots } from './availability.ts';
import {
  actOnBooking,
  createBooking,
  getAvailability,
  getContacts,
} from './bookings.service.ts';

/**
 * The bookings slice's four unsettleable questions.
 *
 * ══ WHY THESE ══════════════════════════════════════════════════════════════
 *
 * Most of this module is CRUD with a scoped `where`. What is worth driving
 * against a real PostgreSQL is:
 *
 *   1. THE CONSTRAINT ITSELF. `CLAUDE.md` §6 makes it Do-Not-Vibe, and an
 *      exclusion constraint that does not fire is indistinguishable from one
 *      that does until two people book the same slot.
 *   2. THE PREDICATE AGREEING WITH IT. The offered slots and the writable slots
 *      are two expressions of one rule, and the failure is silent in one
 *      direction.
 *   3. THE TRANSITIONS, including the one that can be refused — reinstating
 *      into a slot somebody else has taken.
 *   4. THE MAIL RULE. A failing send must not undo a status change.
 */

const ctx = useTransaction();

/**
 * A logger that discards.
 *
 * The service logs a warning when a send fails, and one test provokes exactly
 * that. Discarding keeps the suite's output readable; asserting on the line is
 * `signup.integration.test.ts`'s job for the one event where an unasserted log
 * is the whole signal, and this is not that.
 */
const testLog = { warn: (): void => {} };

const MONDAY = 0;
/** A Monday well inside the 60-day horizon, so no test depends on today. */
const BOOKING_DAY = '2026-08-24';

async function publishedSalon(): Promise<{
  owner: AccountWithBusiness;
  handle: string;
  serviceId: string;
}> {
  const owner = await accountWithBusiness(ctx, 'Booking Salon');
  const scope = { userId: owner.userId };

  const service = await addService(ctx.db, scope, {
    name: 'Silk press',
    durationMinutes: 60,
    priceKes: 2500,
    position: undefined,
  });

  await setOpeningHours(ctx.db, scope, [
    { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '13:00' },
  ]);

  const published = await publishMyBusiness(ctx.db, scope);

  return { owner, handle: published.handle, serviceId: service.id };
}

/** Books directly, bypassing the route — the service is the unit under test. */
async function book(
  handle: string,
  serviceId: string,
  localTime: string,
  overrides: { clientEmail?: string; teamMemberId?: string } = {},
): Promise<string> {
  const created = await createBooking(ctx.db, {
    handle,
    serviceId,
    teamMemberId: overrides.teamMemberId,
    clientName: 'Grace Wanjiru',
    clientEmail: overrides.clientEmail ?? 'grace@example.com',
    clientPhone: '+254700000000',
    // Africa/Nairobi is UTC+3 and always has been, so a local time is written
    // with an explicit +03:00 rather than computed. An explicit offset is what
    // makes these tests independent of the machine's zone.
    startsAt: `${BOOKING_DAY}T${localTime}:00+03:00`,
    paymentProofUrl: undefined,
  });
  return created.id;
}

describe('the exclusion constraint is the authority', () => {
  it('refuses a second booking that overlaps the first', async () => {
    const salon = await publishedSalon();

    await book(salon.handle, salon.serviceId, '09:00');

    // 09:30 starts inside the 09:00–10:00 booking. Nothing in the service
    // checks this — `CLAUDE.md` §5 forbids a pre-check as the authority — so a
    // failure here is the DATABASE refusing, translated.
    await expect(
      book(salon.handle, salon.serviceId, '09:30'),
    ).rejects.toMatchObject({ slug: 'slot-taken' });
  });

  it('allows a booking that starts exactly when the last one ends', async () => {
    const salon = await publishedSalon();

    await book(salon.handle, salon.serviceId, '09:00');

    // ── THE HALF-OPEN BOUNDARY, DRIVEN ────────────────────────────────────
    //
    // `tstzrange` is `[start, end)` by default, so 10:00 does not overlap a
    // booking that ends at 10:00. Without this test the constraint could be
    // silently inclusive and the only symptom would be a salon unable to run
    // back-to-back appointments — which reads as "the app is broken" rather
    // than as a range-bound bug.
    await expect(
      book(salon.handle, salon.serviceId, '10:00'),
    ).resolves.toBeTypeOf('string');
  });

  it('treats "any professional" bookings as contending with each other', async () => {
    const salon = await publishedSalon();

    await book(salon.handle, salon.serviceId, '09:00');

    // Both have `team_member_id = NULL`. NULL is not equal to NULL in SQL, so
    // WITHOUT the coalesce-to-sentinel in the constraint these two would not
    // contend and a one-person salon could double-book itself all day. This is
    // the test that fails if that coalesce is ever removed.
    await expect(
      book(salon.handle, salon.serviceId, '09:00', {
        clientEmail: 'someone-else@example.com',
      }),
    ).rejects.toMatchObject({ slug: 'slot-taken' });
  });

  it('lets a cancelled booking free its slot', async () => {
    const salon = await publishedSalon();
    const scope = { userId: salon.owner.userId };
    const first = await book(salon.handle, salon.serviceId, '09:00');

    await actOnBooking(
      { db: ctx.db, mailer: silentMailer(), log: testLog, salonName: 'S' },
      scope,
      first,
      'cancel',
    );

    // The constraint's `WHERE status <> 'cancelled'` in action.
    await expect(
      book(salon.handle, salon.serviceId, '09:00', {
        clientEmail: 'second@example.com',
      }),
    ).resolves.toBeTypeOf('string');
  });
});

describe('availability agrees with the constraint', () => {
  it('offers only slots the constraint would accept, and stops offering one that is taken', async () => {
    const salon = await publishedSalon();

    const before = await getAvailability(ctx.db, {
      handle: salon.handle,
      serviceId: salon.serviceId,
      date: BOOKING_DAY,
      teamMemberId: undefined,
      now: new Date('2026-08-01T09:00:00Z'),
    });

    // 09:00–13:00, hour-long service, half-hour grid. 12:30 is NOT offered
    // because the service would run to 13:30 and the salon shuts at 13:00 —
    // the "must fit before close" rule, which a naive `start < close` gets
    // wrong and which would produce bookings the salon cannot serve.
    expect(before.slots).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
    ]);

    await book(salon.handle, salon.serviceId, '10:00');

    const after = await getAvailability(ctx.db, {
      handle: salon.handle,
      serviceId: salon.serviceId,
      date: BOOKING_DAY,
      teamMemberId: undefined,
      now: new Date('2026-08-01T09:00:00Z'),
    });

    // ── THE PAIR, ASSERTED AS A PAIR ──────────────────────────────────────
    //
    // A 10:00–11:00 booking removes every start whose hour would overlap it:
    // 09:30 (runs to 10:30), 10:00 and 10:30. 09:00 survives because it ends
    // exactly at 10:00 — the same half-open rule the constraint uses — and so
    // does 11:30, which starts after it.
    expect(after.slots).toEqual(['09:00', '11:00', '11:30', '12:00']);

    // ── EACH SLOT INDIVIDUALLY, NOT ALL OF THEM TOGETHER ──────────────────
    //
    // The first version of this booked every offered slot in a loop and was
    // wrong: 11:00 and 11:30 are both offered and they overlap EACH OTHER, so
    // taking one legitimately removes the other. Availability answers "which
    // starts are free right now", not "which set can be booked at once".
    //
    // So each is booked inside a savepoint and rolled back, which asserts the
    // property that actually matters — every offered slot is one the constraint
    // would accept — without the test's own writes changing the answer.
    for (const slot of after.slots) {
      await sql`savepoint slot_probe`.execute(ctx.db);
      await expect(
        book(salon.handle, salon.serviceId, slot, {
          clientEmail: `client-${slot}@example.com`,
        }),
        `${slot} was offered, so it must be bookable`,
      ).resolves.toBeTypeOf('string');
      await sql`rollback to savepoint slot_probe`.execute(ctx.db);
    }
  });

  it('offers nothing on a day the salon is closed', async () => {
    const salon = await publishedSalon();

    // A Tuesday. The salon has one opening-hours row, for Monday, and A6 makes
    // an absent day closed rather than a row with equal times.
    const closed = await getAvailability(ctx.db, {
      handle: salon.handle,
      serviceId: salon.serviceId,
      date: '2026-08-25',
      teamMemberId: undefined,
      now: new Date('2026-08-01T09:00:00Z'),
    });

    expect(closed.slots).toEqual([]);
  });

  it('refuses a past date rather than answering with an empty day', async () => {
    const salon = await publishedSalon();

    // The distinction matters to the client: an empty list means "fully
    // booked" and a 400 means "not a day you may ask about". A page that
    // conflated them would tell someone a date they mistyped is full.
    await expect(
      getAvailability(ctx.db, {
        handle: salon.handle,
        serviceId: salon.serviceId,
        date: '2026-08-24',
        teamMemberId: undefined,
        now: new Date('2026-09-01T09:00:00Z'),
      }),
    ).rejects.toMatchObject({ slug: 'validation-failed' });
  });

  it('is not readable for an unpublished salon', async () => {
    const owner = await accountWithBusiness(ctx, 'Draft Salon');
    const scope = { userId: owner.userId };
    await addService(ctx.db, scope, {
      name: 'Cut',
      durationMinutes: 30,
      priceKes: 500,
      position: undefined,
    });
    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);

    // Give it a handle WITHOUT publishing — the state the ADR-004 filter exists
    // for, and one the publish route cannot produce.
    await sql`
      update public.businesses set handle = 'draft-salon'
       where id = ${owner.businessId}::uuid
    `.execute(ctx.db);

    await expect(
      getAvailability(ctx.db, {
        handle: 'draft-salon',
        serviceId: '00000000-0000-4000-8000-00000000000a',
        date: BOOKING_DAY,
        teamMemberId: undefined,
        now: new Date('2026-08-01T09:00:00Z'),
      }),
    ).rejects.toMatchObject({ slug: 'not-found' });
  });
});

describe('the status transitions', () => {
  let mailer: RecordingMailer;

  beforeEach(() => {
    mailer = recordingMailer();
  });

  it('moves booked → confirmed → cancelled, and emails each time', async () => {
    const salon = await publishedSalon();
    const scope = { userId: salon.owner.userId };
    const id = await book(salon.handle, salon.serviceId, '09:00');

    const deps = {
      db: ctx.db,
      mailer,
      log: testLog,
      salonName: 'Booking Salon',
    };

    expect((await actOnBooking(deps, scope, id, 'confirm')).status).toBe(
      'confirmed',
    );
    expect((await actOnBooking(deps, scope, id, 'cancel')).status).toBe(
      'cancelled',
    );

    expect(mailer.sent.map((mail) => mail.subject)).toEqual([
      'Your booking with Booking Salon is confirmed',
      'Your booking with Booking Salon has been cancelled',
    ]);
    // The client, not the owner. A confirmation sent to the salon would be a
    // salon telling itself something it just did.
    expect(new Set(mailer.sent.map((mail) => mail.to))).toEqual(
      new Set(['grace@example.com']),
    );
  });

  it('refuses a transition the booking is not in a state for', async () => {
    const salon = await publishedSalon();
    const scope = { userId: salon.owner.userId };
    const id = await book(salon.handle, salon.serviceId, '09:00');
    const deps = {
      db: ctx.db,
      mailer,
      log: testLog,
      salonName: 'Booking Salon',
    };

    // A 409, not a 404: the booking IS the owner's and is on their screen.
    await expect(
      actOnBooking(deps, scope, id, 'reinstate'),
    ).rejects.toMatchObject({ slug: 'invalid-booking-transition' });

    // And nothing was emailed about a change that did not happen.
    expect(mailer.sent).toEqual([]);
  });

  it('refuses to reinstate into a slot somebody else has taken', async () => {
    const salon = await publishedSalon();
    const scope = { userId: salon.owner.userId };
    const deps = {
      db: ctx.db,
      mailer,
      log: testLog,
      salonName: 'Booking Salon',
    };

    const first = await book(salon.handle, salon.serviceId, '09:00');
    await actOnBooking(deps, scope, first, 'cancel');

    // The slot was free while it was cancelled, and somebody took it.
    await book(salon.handle, salon.serviceId, '09:00', {
      clientEmail: 'second@example.com',
    });

    // ── THE REINSTATE RACE, WHICH IS REAL AND NOT HYPOTHETICAL ────────────
    //
    // The exclusion constraint is re-evaluated on the UPDATE, so this is the
    // one transition that can be refused by the database rather than by a
    // status rule. It surfaces as `slot-taken` rather than as a 500.
    await expect(
      actOnBooking(deps, scope, first, 'reinstate'),
    ).rejects.toMatchObject({ slug: 'slot-taken' });
  });

  it('keeps the status change when the email fails', async () => {
    const salon = await publishedSalon();
    const scope = { userId: salon.owner.userId };
    const id = await book(salon.handle, salon.serviceId, '09:00');

    // ── DEFINITION_OF_DONE'S RULE, DRIVEN ─────────────────────────────────
    //
    // Dispatch happens after the write and is best-effort. A provider outage
    // must not roll back a cancellation the owner has already made — the
    // appointment IS cancelled, the salon has acted on it, and a 500 would
    // invite them to cancel it twice.
    const broken: Mailer = {
      send: () => Promise.reject(new Error('provider down')),
    };

    const moved = await actOnBooking(
      { db: ctx.db, mailer: broken, log: testLog, salonName: 'Booking Salon' },
      scope,
      id,
      'cancel',
    );

    expect(moved.status).toBe('cancelled');

    // And it is cancelled in the DATABASE, not merely in the returned object.
    const stored = await sql<{ status: string }>`
      select status from public.bookings where id = ${id}::uuid
    `.execute(ctx.db);
    expect(stored.rows[0]?.status).toBe('cancelled');
  });

  it('will not touch another salon’s booking', async () => {
    const salon = await publishedSalon();
    const id = await book(salon.handle, salon.serviceId, '09:00');

    const stranger = await accountWithBusiness(ctx, 'Somewhere Else');

    await expect(
      actOnBooking(
        {
          db: ctx.db,
          mailer,
          log: testLog,
          salonName: 'Somewhere Else',
        },
        { userId: stranger.userId },
        id,
        'confirm',
      ),
    ).rejects.toBeInstanceOf(ProblemError);

    const stored = await sql<{ status: string }>`
      select status from public.bookings where id = ${id}::uuid
    `.execute(ctx.db);
    expect(stored.rows[0]?.status, 'the refusal is not merely reported').toBe(
      'booked',
    );
  });
});

describe('contacts are derived, not stored', () => {
  it('groups by email, counts, and shows the most recent name', async () => {
    const salon = await publishedSalon();

    await book(salon.handle, salon.serviceId, '09:00', {
      clientEmail: 'repeat@example.com',
    });
    await book(salon.handle, salon.serviceId, '11:00', {
      clientEmail: 'repeat@example.com',
    });
    await book(salon.handle, salon.serviceId, '12:00', {
      clientEmail: 'once@example.com',
    });

    const contacts = await getContacts(ctx.db, {
      userId: salon.owner.userId,
    });

    expect(contacts).toHaveLength(2);
    // Most recent first, and the repeat client counted rather than duplicated.
    expect(contacts[0]?.email).toBe('once@example.com');
    expect(
      contacts.find((c) => c.email === 'repeat@example.com')?.bookingCount,
    ).toBe(2);
  });
});

describe('the availability predicate on its own', () => {
  // Pure, so the boundaries are asserted without a database in the way.
  it('requires the service to fit before closing', () => {
    expect(
      availableSlots({
        windows: [{ openMinutes: 540, closeMinutes: 660 }],
        busy: [],
        durationMinutes: 60,
        notBeforeMinutes: undefined,
      }),
      // 09:00 and 09:30 fit; 10:00 would run to 11:00 which is exactly close,
      // so it fits too. 10:30 would not.
    ).toEqual(['09:00', '09:30', '10:00']);
  });

  it('anchors the grid to the opening time, not to the hour', () => {
    expect(
      availableSlots({
        windows: [{ openMinutes: 555, closeMinutes: 675 }],
        busy: [],
        durationMinutes: 30,
        notBeforeMinutes: undefined,
      }),
      // Opens 09:15. Anchoring to the hour would make the first quarter-hour of
      // every such day unbookable and nobody would be able to say why.
    ).toEqual(['09:15', '09:45', '10:15', '10:45']);
  });
});

interface RecordingMailer extends Mailer {
  readonly sent: Mail[];
}

function recordingMailer(): RecordingMailer {
  const sent: Mail[] = [];
  return {
    sent,
    send: (mail: Mail) => {
      sent.push(mail);
      return Promise.resolve();
    },
  };
}

function silentMailer(): Mailer {
  return { send: () => Promise.resolve() };
}
