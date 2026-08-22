import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';
import { ownedBusinessOf, type OwnerScope } from '../scope.ts';
import {
  SALON_TIME_ZONE,
  SLOT_MINUTES,
  type BookingStatus,
} from './bookings.schema.ts';

/**
 * Knows the database. Applies the membership scoping rule to every owner read
 * and write (`CLAUDE.md` §4, §5).
 *
 * ── THE PUBLIC READS SCOPE DIFFERENTLY, AND SAY SO ─────────────────────────
 *
 * `findPublishedSalonId`, `findSlotOccupancy` and `insertBooking` serve an
 * UNAUTHENTICATED caller: there is no member to traverse. What replaces the
 * traversal is `published = true` on the salon (ADR-004) and the handle, and
 * every one of them carries both. A public read that forgot either would serve
 * a draft salon's diary to anyone who guessed a name.
 */

export interface PublishedSalonRow {
  readonly businessId: string;
  readonly name: string;
}

/** The salon behind a public handle, or `undefined` if it is not published. */
export async function findPublishedSalonId(
  executor: Executor,
  handle: string,
): Promise<PublishedSalonRow | undefined> {
  const result = await sql<PublishedSalonRow>`
    select id as "businessId", name
      from public.businesses
     where handle = ${handle}
       -- ADR-004. Without this the availability of an unpublished salon is
       -- readable by anyone who learns its handle.
       and published = true
  `.execute(executor);

  return result.rows[0];
}

export interface SalonServiceRow {
  readonly id: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceKes: number;
}

/** A service, scoped to the salon it must belong to. */
export async function findServiceForBusiness(
  executor: Executor,
  businessId: string,
  serviceId: string,
): Promise<SalonServiceRow | undefined> {
  const result = await sql<SalonServiceRow>`
    select id, name, duration_minutes as "durationMinutes", price_kes as "priceKes"
      from public.services
     where id = ${serviceId}::uuid
       -- Scoped, so a service id from another salon is a 404 rather than a
       -- booking made at the wrong shop with the wrong price.
       and business_id = ${businessId}::uuid
  `.execute(executor);

  return result.rows[0];
}

/** Whether the team member, if named, belongs to this salon. */
export async function teamMemberBelongsTo(
  executor: Executor,
  businessId: string,
  teamMemberId: string,
): Promise<boolean> {
  const result = await sql<{ id: string }>`
    select id from public.team_members
     where id = ${teamMemberId}::uuid and business_id = ${businessId}::uuid
  `.execute(executor);

  return result.rows.length > 0;
}

export interface OpeningWindowRow {
  readonly openTime: string;
  readonly closeTime: string;
}

/**
 * The salon's opening hours for one calendar date, in local time.
 *
 * ── THE DAY-OF-WEEK CONVERSION HAPPENS IN POSTGRESQL, DELIBERATELY ─────────
 *
 * `opening_hours.day_of_week` is 0 = Monday. PostgreSQL's `extract(isodow)` is
 * 1 = Monday, so the `- 1` below is the whole of the translation and it is
 * written once. Doing it in JavaScript would mean `new Date(...)`, whose
 * `getDay()` is 0 = SUNDAY and whose value depends on the server's zone — three
 * conventions and a environment variable, to answer "which day is it in
 * Nairobi".
 */
export async function findOpeningWindows(
  executor: Executor,
  businessId: string,
  date: string,
): Promise<OpeningWindowRow[]> {
  const result = await sql<OpeningWindowRow>`
    select to_char(open_time, 'HH24:MI') as "openTime",
           to_char(close_time, 'HH24:MI') as "closeTime"
      from public.opening_hours
     where business_id = ${businessId}::uuid
       and day_of_week = extract(isodow from ${date}::date)::int - 1
     order by open_time asc
  `.execute(executor);

  return result.rows;
}

export interface OccupiedRangeRow {
  readonly startsAt: string;
  readonly endsAt: string;
}

/**
 * Every booking that OCCUPIES time on this date, in the exclusion constraint's
 * own terms.
 *
 * ══ DO-NOT-VIBE: THIS MUST MATCH `ex_bookings_no_double_booking` EXACTLY ═════
 *
 * `CLAUDE.md` §6 names "the availability predicate and the exclusion
 * constraint" together, and this is why: the constraint decides what may be
 * written and this decides what is offered. They are two expressions of one
 * rule, and a disagreement is a defect in whichever direction it goes —
 * permissive means the API offers a slot and then 409s on it, restrictive means
 * bookable slots quietly vanish and nobody reports it.
 *
 * Clause for clause, against the migration:
 *
 *   business_id = …                    same salon
 *   coalesce(team_member_id, sentinel) same person, with "any professional"
 *                                      collapsing to the same all-zero uuid the
 *                                      constraint uses — NULL is not equal to
 *                                      NULL, so without this every unassigned
 *                                      booking would be invisible here and
 *                                      exempt there
 *   status <> 'cancelled'              a cancelled booking occupies nothing
 *
 * **`ends_at` is read rather than recomputed.** The trigger derives it and the
 * constraint indexes it; recalculating `starts_at + duration` here would be a
 * third expression of the same fact, and the one most likely to drift.
 *
 * The date filter is a widened window rather than an exact day: a booking that
 * starts before midnight and runs past it still occupies the morning, and one
 * that starts late on the day still matters. The overlap test in the service
 * does the precise work; this only has to avoid reading the whole table.
 */
export async function findOccupiedRanges(
  executor: Executor,
  input: {
    readonly businessId: string;
    readonly date: string;
    readonly teamMemberId: string | undefined;
  },
): Promise<OccupiedRangeRow[]> {
  const result = await sql<OccupiedRangeRow>`
    select to_char(starts_at at time zone ${SALON_TIME_ZONE}, 'YYYY-MM-DD"T"HH24:MI') as "startsAt",
           to_char(ends_at at time zone ${SALON_TIME_ZONE}, 'YYYY-MM-DD"T"HH24:MI') as "endsAt"
      from public.bookings
     where business_id = ${input.businessId}::uuid
       and coalesce(team_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
         = coalesce(${input.teamMemberId ?? null}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
       and status <> 'cancelled'
       and starts_at < ((${input.date}::date + 2) || ' 00:00')::timestamp at time zone ${SALON_TIME_ZONE}
       and ends_at > ((${input.date}::date - 1) || ' 00:00')::timestamp at time zone ${SALON_TIME_ZONE}
  `.execute(executor);

  return result.rows;
}

export interface InsertedBookingRow {
  readonly id: string;
  readonly serviceName: string;
  readonly durationMinutes: number;
  readonly priceKes: number;
  readonly startsAt: string;
  readonly status: string;
}

/**
 * Writes the booking.
 *
 * **No availability pre-check anywhere near this.** `CLAUDE.md` §5: conflicts
 * are enforced by the constraint and never "re-implemented or pre-checked as
 * the authority in application code". A `select` before this insert would pass
 * for both of two simultaneous clients and write twice; the constraint is what
 * refuses the second, and the service turns its 23P01 into a 409.
 *
 * `ends_at` is omitted on purpose — the trigger derives it, and supplying it
 * would be a second writer for a value the constraint indexes.
 */
export async function insertBooking(
  executor: Executor,
  input: {
    readonly businessId: string;
    readonly serviceId: string;
    readonly teamMemberId: string | undefined;
    readonly serviceName: string;
    readonly durationMinutes: number;
    readonly priceKes: number;
    readonly clientName: string;
    readonly clientEmail: string;
    readonly clientPhone: string;
    readonly startsAt: string;
    /** An object key in the private bucket. Never a URL — see the migration. */
    readonly paymentProofKey: string | undefined;
  },
): Promise<InsertedBookingRow | undefined> {
  const result = await sql<InsertedBookingRow>`
    insert into public.bookings (
      business_id, service_id, team_member_id,
      service_name, duration_minutes, price_kes,
      client_name, client_email, client_phone,
      starts_at, ends_at, payment_proof_key
    ) values (
      ${input.businessId}::uuid,
      ${input.serviceId}::uuid,
      ${input.teamMemberId ?? null}::uuid,
      ${input.serviceName},
      ${input.durationMinutes},
      ${input.priceKes},
      ${input.clientName},
      ${input.clientEmail},
      ${input.clientPhone},
      ${input.startsAt}::timestamptz,
      -- A placeholder the trigger overwrites. NOT NULL is checked after BEFORE
      -- triggers run, so this could be anything; it is starts_at so that a
      -- future reader who deletes the trigger gets a zero-length range rather
      -- than a null-constraint violation they might "fix" by widening it.
      ${input.startsAt}::timestamptz,
      ${input.paymentProofKey ?? null}::text
    )
    returning
      id,
      service_name as "serviceName",
      duration_minutes as "durationMinutes",
      price_kes as "priceKes",
      to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "startsAt",
      status
  `.execute(executor);

  return result.rows[0];
}

/** Whether an error is the double-booking constraint refusing a write. */
export function isSlotTaken(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; constraint?: unknown };
  // Matching on the constraint NAME as well as 23P01, for the reason
  // `isSecondBusinessConflict` gives: the code alone is every exclusion
  // violation, and a future one on this table would mean something else.
  return (
    candidate.code === '23P01' &&
    candidate.constraint === 'ex_bookings_no_double_booking'
  );
}

export interface OwnerBookingRow {
  readonly id: string;
  readonly serviceName: string;
  readonly durationMinutes: number;
  readonly priceKes: number;
  readonly serviceId: string | null;
  readonly teamMemberId: string | null;
  readonly teamMemberName: string | null;
  readonly clientName: string;
  readonly clientEmail: string;
  readonly clientPhone: string;
  readonly startsAt: string;
  readonly status: BookingStatus;
  readonly hasPaymentProof: boolean;
}

const OWNER_COLUMNS = sql`
  b.id,
  b.service_name as "serviceName",
  b.duration_minutes as "durationMinutes",
  b.price_kes as "priceKes",
  b.service_id as "serviceId",
  b.team_member_id as "teamMemberId",
  t.name as "teamMemberName",
  b.client_name as "clientName",
  b.client_email as "clientEmail",
  b.client_phone as "clientPhone",
  to_char(b.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "startsAt",
  b.status,
  -- ── THE KEY IS REDUCED TO A BOOLEAN *IN SQL*, WHICH IS THE POINT ──────────
  --
  -- Not selected and mapped in TypeScript. If the column travelled as far as a
  -- row object, the next person to add a field to OwnerBookingRow would find it
  -- sitting there looking harmless — and a private object key in a response is
  -- an information leak even though it is not a URL, because it is the exact
  -- string the signing endpoint takes.
  --
  -- Here there is nothing to leak: the value never leaves PostgreSQL.
  (b.payment_proof_key is not null) as "hasPaymentProof"
`;

export async function listBookings(
  executor: Executor,
  scope: OwnerScope,
  status: BookingStatus | undefined,
): Promise<OwnerBookingRow[]> {
  const result = await sql<OwnerBookingRow>`
    select ${OWNER_COLUMNS}
      from public.bookings b
      -- LEFT, because the team member may have been deleted or may never have
      -- been named. An inner join would silently drop every "any professional"
      -- booking from the owner's own diary.
      left join public.team_members t on t.id = b.team_member_id
     where b.business_id = ${ownedBusinessOf(scope.userId)}
       and (${status ?? null}::text is null or b.status = ${status ?? null}::text)
     order by b.starts_at desc
  `.execute(executor);

  return result.rows;
}

/** The booking's current status, scoped. `undefined` means not this salon's. */
export async function findBookingStatus(
  executor: Executor,
  scope: OwnerScope,
  bookingId: string,
): Promise<{ readonly status: BookingStatus } | undefined> {
  const result = await sql<{ status: BookingStatus }>`
    select status from public.bookings
     where id = ${bookingId}::uuid
       and business_id = ${ownedBusinessOf(scope.userId)}
  `.execute(executor);

  return result.rows[0];
}

/**
 * The private object key for one booking's payment proof.
 *
 * ══ THE ONLY READ THAT RETURNS THE KEY, AND IT IS SCOPED LIKE EVERY OTHER ════
 *
 * **DO-NOT-VIBE: the payment-proof access path (`CLAUDE.md` §6).**
 *
 * `ownedBusinessOf(scope.userId)` is in the `where`, not in a check around it —
 * so a booking id belonging to another salon matches no row and the caller
 * learns nothing about whether it exists. That is the same conflation
 * `findBusinessForUser` makes and for the same reason: a distinguishable
 * response turns a booking id into an oracle.
 *
 * **Two absences are returned separately and they are not the same thing.**
 * `undefined` means no such booking FOR THIS OWNER. A row with a null key means
 * the booking is theirs and simply has no proof attached. The route answers 404
 * to both — deliberately identical to the client — but the service needs to tell
 * them apart to log honestly, and folding them here would throw that away at the
 * only point it is known.
 */
export async function findPaymentProofKey(
  executor: Executor,
  scope: OwnerScope,
  bookingId: string,
): Promise<{ readonly key: string | null } | undefined> {
  const result = await sql<{ key: string | null }>`
    select payment_proof_key as key
      from public.bookings
     where id = ${bookingId}::uuid
       and business_id = ${ownedBusinessOf(scope.userId)}
  `.execute(executor);

  return result.rows[0];
}

/**
 * Moves a booking to [next], but only from one of [from].
 *
 * ── THE TRANSITION IS THE `where` CLAUSE, NOT A READ-THEN-WRITE ────────────
 *
 * Two owners on two devices could both read `booked` and both write; putting
 * the permitted origin states in the `where` makes the update itself the check,
 * so the second changes no rows. The route reads the status separately only to
 * tell "wrong state" from "not yours" in the RESPONSE — and that read is
 * advisory, not the guard.
 */
export async function transitionBooking(
  executor: Executor,
  scope: OwnerScope,
  bookingId: string,
  from: readonly BookingStatus[],
  next: BookingStatus,
): Promise<OwnerBookingRow | undefined> {
  const result = await sql<OwnerBookingRow>`
    with updated as (
      update public.bookings
         set status = ${next}
       where id = ${bookingId}::uuid
         and business_id = ${ownedBusinessOf(scope.userId)}
         -- PARAMETERISED, WHERE THIS USED TO BUILD SQL BY HAND. It was an
         -- sql.raw() wrapping an array literal assembled by mapping each status
         -- into single quotes and joining on commas.
         --
         -- Not a live vulnerability: "from" comes from the TRANSITIONS map in
         -- the service and is never caller-supplied, so nothing hostile can
         -- reach the quoting. But it was a hand-rolled escape in a file that
         -- parameterises everything else, and hand-rolled escapes are how the
         -- next person concludes this is the house style.
         --
         -- The parameterised form is also shorter. pg sends a text[] as one
         -- bound parameter, so the quoting is the driver's problem and stops
         -- being anybody's.
         --
         -- (This comment carried the original expression verbatim for one
         -- draft. It contains backticks, and backticks inside a JS template
         -- literal end the literal -- twelve TS1005 parse errors. CLAUDE.md
         -- warns about exactly this and it still happened; the shape is
         -- described in prose instead.)
         and status = any(${[...from]}::text[])
      returning *
    )
    select ${OWNER_COLUMNS}
      from updated b
      left join public.team_members t on t.id = b.team_member_id
  `.execute(executor);

  return result.rows[0];
}

export interface ContactRow {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly bookingCount: number;
  readonly lastBookingAt: string;
}

/**
 * The salon's clients, derived rather than stored.
 *
 * ── NO CONTACTS TABLE, AND THAT IS THE DESIGN ──────────────────────────────
 *
 * A separate table would need to be kept in step with bookings on every write,
 * and would disagree with them the first time one failed. Grouping by email is
 * the whole implementation: the email is what identifies a returning client
 * across bookings, because a name is not unique and a phone number gets
 * retyped.
 *
 * The NAME and PHONE come from the most recent booking rather than the first —
 * `distinct on` with the ordering below — so a client who corrects a typo or
 * changes number is shown as they are now.
 */
export async function listContacts(
  executor: Executor,
  scope: OwnerScope,
): Promise<ContactRow[]> {
  const result = await sql<ContactRow>`
    select distinct on (lower(client_email))
           client_name as name,
           client_email as email,
           client_phone as phone,
           count(*) over (partition by lower(client_email))::int as "bookingCount",
           to_char(
             max(starts_at) over (partition by lower(client_email)) at time zone 'UTC',
             'YYYY-MM-DD"T"HH24:MI:SS"Z"'
           ) as "lastBookingAt"
      from public.bookings
     where business_id = ${ownedBusinessOf(scope.userId)}
     -- distinct-on keeps the FIRST row of each group, so the ordering decides
     -- which booking supplies the name and phone: the most recent one.
     order by lower(client_email), starts_at desc
  `.execute(executor);

  // Most recent client first. Done here rather than in SQL because `distinct on`
  // fixes the ORDER BY's leading column, so a second sort would need a wrapping
  // query for no benefit at this size.
  return [...result.rows].sort((a, b) =>
    a.lastBookingAt < b.lastBookingAt ? 1 : -1,
  );
}

/** The grid the availability endpoint walks. Exported for its test. */
export const SLOT_STEP_MINUTES = SLOT_MINUTES;
