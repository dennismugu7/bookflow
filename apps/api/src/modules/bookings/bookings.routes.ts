import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { principalOf } from '../../platform/auth.ts';
import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import {
  removeQuietly,
  StorageError,
  type StorageClient,
} from '../../platform/storage.ts';
import type { Mailer } from '../../platform/resend.ts';
import {
  CONTENT_TYPE_FOR,
  detectImageFormat,
  MAX_IMAGE_BYTES,
} from '../media/media.schema.ts';
import {
  availabilityQuerySchema,
  availabilitySchema,
  bookingReceiptSchema,
  bookingsQuerySchema,
  contactsSchema,
  ownerBookingSchema,
  ownerBookingsSchema,
  paymentProofSchema,
} from './bookings.schema.ts';
import {
  actOnBooking,
  createBooking,
  getAvailability,
  getBookings,
  getContacts,
  getPaymentProof,
  type BookingAction,
} from './bookings.service.ts';
import { findPublishedSalonId } from './bookings.repository.ts';
import { getMyBusiness } from '../businesses/businesses.service.ts';

/** Knows HTTP. Parses, calls the service, serialises. No logic. */

const handleParam = z.object({
  handle: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

export function registerBookingRoutes(
  app: FastifyInstance,
  db: () => Executor,
  storage: StorageClient,
  mailer: Mailer,
): void {
  // ── PUBLIC: AVAILABILITY ──────────────────────────────────────────────────
  //
  // `config: { public: true }` is the opt-OUT from authentication (ADR-017).
  // Reachable by anyone with a handle, and it answers only for a PUBLISHED
  // salon — `requireSalon` filters on `published` for the same reason the
  // public salon page does.
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/public/salons/:handle/availability',
    {
      config: {
        public: true,
        // ── THE HEAVIEST QUERY IN THE SYSTEM, NOW BOUNDED ──────────────────
        //
        // Two scoped reads and an overlap computation per call, unauthenticated
        // and cacheable by nobody. A visitor comparing days across a fortnight
        // fires one of these per tap, so the ceiling has to clear real browsing
        // — 60 an hour is roughly four times the busiest honest session.
        //
        // Per IP, which is the only key available: there is no principal on a
        // public route. That carries sign-up's CGNAT caveat — a shared carrier
        // NAT is one key — which is why this is generous rather than tight. It
        // raises the cost of scraping a salon's whole diary without pretending
        // to prevent it.
        rateLimit: { max: 60, timeWindow: '1 hour' },
      },
      schema: {
        operationId: 'getSalonAvailability',
        summary: 'Bookable start times for one service on one day',
        description:
          'Unauthenticated. Slots are on a 30-minute grid anchored to the opening time, and a slot is offered only when the service fits before closing AND nothing already occupies it — matching the exclusion constraint exactly, so an offered slot does not 409. Times are Africa/Nairobi (ADR-005). A past date or one beyond 60 days is refused as validation-failed rather than answered with an empty list.',
        tags: ['public'],
        params: handleParam,
        querystring: availabilityQuerySchema,
        response: { 200: availabilitySchema },
      },
    },
    async (request) =>
      await getAvailability(db(), {
        handle: request.params.handle,
        serviceId: request.query.serviceId,
        date: request.query.date,
        teamMemberId: request.query.teamMemberId,
        // Injected rather than read inside the service, so a test can drive a
        // fixed "now" and the past-date rule is testable at all.
        now: new Date(),
      }),
  );

  // ── PUBLIC: MAKE A BOOKING ────────────────────────────────────────────────
  //
  // multipart, because the payment proof is an optional file. Like the image
  // upload, this route declares no Zod body — there is no JSON body to
  // validate — and checks its parts in the handler. It is the second and last
  // route in the API with that shape.
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/public/salons/:handle/bookings',
    {
      // ── RATE LIMITED, AND @fastify/rate-limit WAS ALREADY AVAILABLE ──────
      //
      // Registered with `global: false` in `app.ts`, so a route is throttled
      // only when it asks — and this one asks. It is the only unauthenticated
      // WRITE in the API apart from sign-up: without a limit one script fills a
      // salon's diary with fictitious bookings, and there is no account to
      // disable afterwards.
      //
      // Keyed on IP, which is weak behind CGNAT — the same caveat sign-up's
      // limiter records at length. It raises the cost without pretending to
      // prevent it, and the exclusion constraint bounds the damage at the
      // number of real slots.
      //
      // Looser than sign-up's: a family sharing a connection may legitimately
      // book several appointments in an afternoon.
      //
      // ── TIGHTENED, BECAUSE THIS ONE ALSO WRITES TO STORAGE ───────────────
      //
      // It was 10 per 10 minutes — 60 an hour. It is the tightest of the three
      // public routes now, and deliberately tighter than the two reads: every
      // call can carry a 5 MB image that is UPLOADED before the booking is
      // validated, so an abusive caller fills a bucket as well as a diary. The
      // reads cost CPU that ends with the response; this costs bytes that stay.
      //
      // 6 in 10 minutes still clears a family booking several appointments in
      // an afternoon, which is the case the old comment was sized for.
      config: {
        public: true,
        rateLimit: { max: 6, timeWindow: '10 minutes' },
      },
      schema: {
        operationId: 'createSalonBooking',
        summary: 'Book a slot',
        description:
          'Unauthenticated, multipart/form-data. Fields: serviceId, startsAt (ISO 8601), clientName, clientEmail, clientPhone, optional teamMemberId, optional paymentProof (JPEG or PNG, 5 MB). The service name, duration and price are snapshotted from the service row at booking time (ADR-006) and never taken from the request. A slot taken concurrently answers 409 slot-taken — that race is what the database exclusion constraint exists for, and the client should re-read availability.',
        tags: ['public'],
        consumes: ['multipart/form-data'],
        params: handleParam,
        response: { 201: bookingReceiptSchema },
      },
    },
    async (request, reply) => {
      const fields = await readBookingParts(
        request,
        storage,
        db,
        request.params.handle,
      );

      // ══ THE UPLOAD IS UNDONE IF THE BOOKING DOES NOT LAND ══════════════════
      //
      // The proof has to be uploaded BEFORE the booking, because the booking row
      // is what stores its key. So there is a window where the object exists and
      // the row does not — and `createBooking` can fail in it, most often with
      // 409 `slot-taken`, which is an ORDINARY double-booking race rather than
      // an exceptional condition.
      //
      // Without this the object stays in the private bucket forever, referenced
      // by nothing: **a client's M-Pesa screenshot retained indefinitely for an
      // appointment that does not exist and that nobody will ever look for.**
      //
      // `media.service.ts` has solved this since the media slice — an upload
      // whose row insert fails is removed the same way. This route was written
      // without reusing it. `removeQuietly` now lives in `platform/storage.ts`
      // so there is one implementation of the rule rather than two chances to
      // forget it.
      //
      // The cleanup NEVER throws, which matters here more than in the media
      // case: the caller is a booking client who needs to be told "that time was
      // taken", and replacing that with a storage error would send them looking
      // for the wrong problem.
      try {
        const booking = await createBooking(db(), {
          handle: request.params.handle,
          ...fields,
        });

        return await reply.code(201).send(booking);
      } catch (error) {
        if (fields.paymentProofKey !== undefined) {
          await removeQuietly(
            (key) => storage.removePrivate(key),
            request.log,
            fields.paymentProofKey,
            'booking failed after the proof was uploaded; object removed',
          );
        }
        throw error;
      }
    },
  );

  // ── OWNER: THE DIARY ──────────────────────────────────────────────────────
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business/bookings',
    {
      schema: {
        operationId: 'listMyBookings',
        summary: "The salon's bookings",
        description:
          'Newest start time first, optionally filtered by status. Carries the snapshot and the client’s details, which is what the salon needs to serve the appointment.',
        tags: ['bookings'],
        querystring: bookingsQuerySchema,
        response: { 200: ownerBookingsSchema },
      },
    },
    async (request) =>
      await getBookings(db(), principalOf(request), request.query.status),
  );

  for (const action of ['confirm', 'cancel', 'reinstate'] as const) {
    app.withTypeProvider<ZodTypeProvider>().post(
      `/v1/me/business/bookings/:bookingId/${action}`,
      {
        schema: {
          operationId: `${action}Booking`,
          summary: `${action[0]?.toUpperCase()}${action.slice(1)} a booking`,
          description: DESCRIPTIONS[action],
          tags: ['bookings'],
          params: z.object({ bookingId: z.uuid() }),
          response: { 200: ownerBookingSchema },
        },
      },
      async (request) => {
        const scope = principalOf(request);

        // The salon's name, for the email. Read here rather than joined into
        // the booking row because it belongs to the message rather than to the
        // booking, and a booking that outlives a rename should be emailed under
        // the name the salon has now.
        const business = await getMyBusiness(db(), scope);
        if (business === undefined) {
          throw new ProblemError('not-found', 'no business for this principal');
        }

        return await actOnBooking(
          { db: db(), mailer, log: request.log, salonName: business.name },
          scope,
          request.params.bookingId,
          action satisfies BookingAction,
        );
      },
    );
  }

  // ── OWNER: THE PAYMENT PROOF ──────────────────────────────────────────────
  //
  // **DO-NOT-VIBE: the payment-proof access path (`CLAUDE.md` §6).**
  //
  // Declared BEFORE the `:bookingId/{action}` POSTs is irrelevant — different
  // method — but its shape is deliberately the same: the caller names a BOOKING
  // and never an object. An endpoint that took a key would sign anything in the
  // bucket for any authenticated owner.
  //
  // GET rather than POST even though it mints something: it is a read of a
  // booking's proof, it is idempotent, and nothing is stored. The short-lived
  // URL is the representation, not a created resource.
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business/bookings/:bookingId/payment-proof',
    {
      schema: {
        operationId: 'getBookingPaymentProof',
        summary: 'A short-lived link to a booking’s payment proof',
        description:
          'Returns a signed URL valid for about five minutes. The object lives in a PRIVATE bucket and is unreachable any other way (ADR-011) — the booking list carries only hasPaymentProof. Answers 404 for a booking that is not this owner’s, does not exist, has no proof, or whose object is missing: the four are deliberately indistinguishable, since a caller who may not read the proof may not learn whether there is one. Do not cache the URL; request another.',
        tags: ['bookings'],
        params: z.object({ bookingId: z.uuid() }),
        response: { 200: paymentProofSchema },
      },
    },
    async (request) =>
      await getPaymentProof(
        { db: db(), storage, log: request.log },
        principalOf(request),
        request.params.bookingId,
      ),
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business/contacts',
    {
      schema: {
        operationId: 'listMyContacts',
        summary: "The salon's clients",
        description:
          'Derived from bookings — there is no contacts table to keep in step. Grouped by email, because a name is not unique and a phone number gets retyped; the name and phone shown are from that client’s most recent booking.',
        tags: ['bookings'],
        response: { 200: contactsSchema },
      },
    },
    async (request) => await getContacts(db(), principalOf(request)),
  );
}

const DESCRIPTIONS: Record<BookingAction, string> = {
  confirm:
    'booked → confirmed. Emails the client the confirmation. A booking in any other state answers 409 invalid-booking-transition.',
  cancel:
    'booked or confirmed → cancelled. Emails the client. The slot becomes bookable again immediately — a cancelled booking occupies nothing.',
  reinstate:
    'cancelled → booked. May answer 409 slot-taken: the slot was free while the booking was cancelled and something else may have taken it, which the exclusion constraint refuses.',
};

/**
 * Reads the multipart parts of a booking request.
 *
 * ── WHY THE FILE IS READ FIRST AND THE FIELDS AFTERWARDS ───────────────────
 *
 * `@fastify/multipart` streams, and the size limit only fires while the body is
 * being consumed — so the file has to be buffered before `truncated` means
 * anything. When there is no file at all, `request.parts()` still has to be
 * drained to reach the fields.
 */
async function readBookingParts(
  request: {
    parts: () => AsyncIterableIterator<unknown>;
    log: { warn(payload: Record<string, unknown>, message: string): void };
  },
  storage: StorageClient,
  db: () => Executor,
  handle: string,
): Promise<{
  serviceId: string;
  teamMemberId: string | undefined;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startsAt: string;
  paymentProofKey: string | undefined;
}> {
  const values = new Map<string, string>();
  let proof: { buffer: Buffer; mimetype: string } | undefined;

  for await (const part of request.parts()) {
    const candidate = part as {
      type?: string;
      fieldname?: string;
      value?: unknown;
      mimetype?: string;
      file?: { truncated?: boolean };
      toBuffer?: () => Promise<Buffer>;
    };

    if (candidate.type === 'file') {
      const buffer = await candidate.toBuffer!();
      if (candidate.file?.truncated === true) {
        throw new ProblemError(
          'upload-rejected',
          `payment proof exceeds ${String(MAX_IMAGE_BYTES)} bytes`,
        );
      }
      proof = { buffer, mimetype: candidate.mimetype ?? '' };
      continue;
    }

    // Strings only. `@fastify/multipart` types a field's `value` as `unknown`,
    // and coercing whatever arrives would turn an unexpected object into the
    // literal text "[object Object]" and then validate THAT — a field that is
    // not a string is a malformed request, and Zod says so below.
    if (
      typeof candidate.fieldname === 'string' &&
      typeof candidate.value === 'string'
    ) {
      values.set(candidate.fieldname, candidate.value);
    }
  }

  const parsed = bookingFieldsSchema.safeParse({
    serviceId: values.get('serviceId'),
    teamMemberId: values.get('teamMemberId') || undefined,
    clientName: values.get('clientName'),
    clientEmail: values.get('clientEmail'),
    clientPhone: values.get('clientPhone'),
    startsAt: values.get('startsAt'),
  });
  if (!parsed.success) {
    // Turned into the same `validation-failed` a Zod body failure produces, so
    // this route's error shape matches every other route's despite not going
    // through the type provider. No field list, no echo.
    throw new ProblemError('validation-failed', 'malformed booking fields');
  }

  let paymentProofKey: string | undefined;
  if (proof !== undefined) {
    // ══ THE BYTES DECIDE, NOT THE HEADER ═════════════════════════════════════
    //
    // This was `ACCEPTED_IMAGE_TYPES.get(proof.mimetype)` — the extension taken
    // from a header the caller writes, on the API's only UNAUTHENTICATED upload.
    // See `media.schema.ts`'s `detectImageFormat` for the argument; it applies
    // with more force here, since there is no account behind this request to
    // hold responsible afterwards.
    const extension = detectImageFormat(proof.buffer);
    if (extension === undefined) {
      throw new ProblemError('upload-rejected', 'unsupported proof type');
    }

    // ── THE OBJECT KEY IS DERIVED FROM THE DATABASE, NEVER FROM THE PATH ────
    //
    // The handle comes off the URL, and the key contains a business id. If the
    // id were derived from the handle by anything other than a scoped read, a
    // caller could aim an upload at a prefix belonging to a salon that is not
    // theirs. So the salon is resolved here — with the same `published` filter
    // every public read uses — and an unresolvable handle stores nothing.
    //
    // The booking still proceeds. `createBooking` re-resolves the salon and
    // will 404 on a bad handle anyway; losing a proof is better than writing it
    // somewhere arbitrary.
    const salon = await findPublishedSalonId(db(), handle);

    if (salon !== undefined) {
      try {
        // ── THE PRIVATE BUCKET, AND `uploadPrivate` RETURNS A KEY ───────────
        //
        // This used to call `storage.upload`, which put a client's payment
        // proof in `public-media` under a `proof/` prefix — a permanently
        // readable URL for somebody's financial document, stored in a column
        // and returned in the owner's booking list.
        //
        // `uploadPrivate` hands back a key and there is no private equivalent
        // of `publicUrl` to turn it into an address. Reaching the object needs
        // `GET /v1/me/business/bookings/{id}/payment-proof` (ADR-011).
        const stored = await storage.uploadPrivate({
          key: `${salon.businessId}/proof/${randomUUID()}.${extension}`,
          body: proof.buffer,
          // Ours, from the verified format. A caller-supplied content type on a
          // stored object is a caller-chosen content type on every read of it.
          contentType: CONTENT_TYPE_FOR[extension],
        });
        paymentProofKey = stored.key;
      } catch (error) {
        if (!(error instanceof StorageError)) throw error;
        // A booking is worth more than its proof. The client can be asked for
        // it again; the appointment cannot be recreated from nothing.
        request.log.warn(
          {
            event: 'booking.proof_upload_failed',
            failure: error.failure,
            detail: error.message,
          },
          'payment proof not stored; booking proceeding without it',
        );
      }
    }
  }

  // Spread out field by field rather than `...parsed.data`:
  // `exactOptionalPropertyTypes` makes Zod's `teamMemberId?: string` a
  // different type from the `string | undefined` the service takes, and the
  // spread would carry the optionality through.
  return {
    serviceId: parsed.data.serviceId,
    teamMemberId: parsed.data.teamMemberId,
    clientName: parsed.data.clientName,
    clientEmail: parsed.data.clientEmail,
    clientPhone: parsed.data.clientPhone,
    startsAt: parsed.data.startsAt,
    paymentProofKey,
  };
}

const bookingFieldsSchema = z.object({
  serviceId: z.uuid(),
  teamMemberId: z.uuid().optional(),
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.email().max(320),
  clientPhone: z.string().trim().min(3).max(40),
  startsAt: z.iso.datetime({ offset: true }),
});
