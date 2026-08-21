import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * RFC 9457 `application/problem+json` (ADR-014).
 *
 * ONE place maps an error to a response. No route builds its own body, because
 * two places producing error responses is two places for them to diverge, and
 * the Flutter client branches on `type` (ADR-014) rather than on a message.
 *
 * `type` is a stable, machine-readable slug and is part of the contract: it may
 * be added to, but an existing slug never changes meaning. Relative URI
 * references are used deliberately — RFC 9457 permits them, and a slug that
 * looks like `https://bookflow.example/...` would imply a document we do not
 * publish at a domain we do not own.
 */

export const PROBLEM_TYPES = {
  'missing-token': {
    status: 401,
    title: 'Authentication required',
  },
  'invalid-token': {
    status: 401,
    title: 'Authentication failed',
  },
  'expired-token': {
    status: 401,
    title: 'Session expired',
  },
  'not-found': {
    status: 404,
    title: 'Not found',
  },
  // The request did not match the route's schema. Carries no field list and no
  // echo of the input, like every other problem here — the client knows what it
  // sent, and a reflected value is how an error response becomes a probe.
  'validation-failed': {
    status: 400,
    title: 'Invalid request',
  },
  // Distinct from `validation-failed` on purpose. The password satisfied the
  // schema and the identity provider still refused it — ADR-030 enables
  // GoTrue's breach check, so this is the one input error the client cannot
  // predict locally, and the copy for it has to say something different.
  'password-rejected': {
    status: 400,
    title: 'Password rejected',
  },
  // The caller already has a business (ADR-003, business-setup decision 8).
  //
  // Specific rather than a generic `conflict`, deliberately: ADR-014 has the
  // client branch on `type` rather than on a message, so a slug is only useful
  // to the degree the client can act on it, and a generic one would force the
  // client to work out WHAT conflicted from something other than the `type`.
  // `password-rejected` above is the precedent for a slug scoped to one
  // situation.
  //
  // Like every entry here it carries no `detail`, so the response does not name
  // or link the business that already exists. That raises no oracle either way
  // — the caller owns it — but the no-detail rule is the API's, not this
  // route's, and one exception is how it stops being a rule.
  'business-already-exists': {
    status: 409,
    title: 'Business already exists',
  },
  // The slot was taken between the availability read and the write.
  //
  // ── THIS IS THE RACE THE EXCLUSION CONSTRAINT EXISTS FOR ──────────────────
  //
  // Not a defect and not an error the client did anything wrong to cause. Two
  // people booking the same slot in the same second both see it free; the
  // database refuses the second, and this is how that refusal reaches them.
  // The client's response is to re-read availability and pick again, which is
  // why this has its own slug rather than folding into a generic conflict.
  //
  // It is also what a REINSTATED booking can hit: a cancelled booking occupies
  // nothing, so its slot may have been taken while it was cancelled.
  'slot-taken': {
    status: 409,
    title: 'That time is no longer free',
  },
  // The booking is not in a state that permits the requested move — confirming
  // one that is cancelled, cancelling one that already is.
  //
  // Distinct from `not-found`, deliberately: the caller is the owner, the
  // booking IS theirs, and telling them it does not exist would send them
  // looking for a row that is on their own screen.
  'invalid-booking-transition': {
    status: 409,
    title: 'That booking cannot change that way',
  },
  // A name that has to be unique within one salon already is — today, a
  // service name (`uq_services_business_name`).
  //
  // Its own slug rather than `validation-failed`, because it is a 409 and not a
  // 400: the request was well formed and the CONFLICT is with state the client
  // can see and fix. Same reasoning as `business-already-exists`, and the same
  // silence — the response does not name the row it collided with, and the
  // client already has the list it came from.
  'duplicate-name': {
    status: 409,
    title: 'Name already used',
  },
  // Publishing was refused because the salon is not ready to be published —
  // it has no name, no service, or no opening hours.
  //
  // ── IT NAMES NOTHING, AND THAT COSTS THE CLIENT NOTHING ───────────────────
  //
  // No `detail`, no list of what is missing, like every other entry here. The
  // client is the owner's own app: it has just read the services, the hours and
  // the name in order to render the screen the publish button sits on, so it
  // can say "add a service first" without being told. A response that
  // enumerated the gaps would be the API's only reflected value, for a caller
  // that already knew the answer.
  'publish-requirements-not-met': {
    status: 409,
    title: 'Not ready to publish',
  },
  // A file was rejected before it was stored — wrong type, or over the size cap.
  // Distinct from `validation-failed` because the request was well formed: the
  // multipart body parsed, the fields were present, and the CONTENT was
  // refused, which is a different thing for a client to say to a user.
  'upload-rejected': {
    status: 400,
    title: 'Upload rejected',
  },
  // Object storage is unreachable or refused for a reason that is not the
  // caller's fault. 503 for the same reason as `auth-unavailable`: it may
  // succeed later, and a 500 tells the client to give up.
  'storage-unavailable': {
    status: 503,
    title: 'Storage service unavailable',
  },
  'rate-limited': {
    status: 429,
    title: 'Too many requests',
  },
  // The identity provider is unreachable or refused for a reason that is not
  // the caller's fault. 503 rather than 500: the request may succeed later.
  'auth-unavailable': {
    status: 503,
    title: 'Authentication service unavailable',
  },
  'internal-error': {
    status: 500,
    title: 'Internal server error',
  },
} as const;

export type ProblemSlug = keyof typeof PROBLEM_TYPES;

export class ProblemError extends Error {
  readonly slug: ProblemSlug;

  constructor(slug: ProblemSlug, detail?: string) {
    super(detail ?? PROBLEM_TYPES[slug].title);
    this.name = 'ProblemError';
    this.slug = slug;
  }
}

interface ProblemBody {
  type: string;
  title: string;
  status: number;
}

/**
 * Builds the body. Deliberately carries NO `detail` and NO `instance`.
 *
 * A detail string is where an error response leaks: "no membership for user X
 * on business Y" is a helpful message and an oracle. The slug and the title are
 * the contract; anything more specific belongs in the server log, which is
 * where `internalDetail` goes.
 */
export function problemBody(slug: ProblemSlug): ProblemBody {
  const spec = PROBLEM_TYPES[slug];
  return { type: `/problems/${slug}`, title: spec.title, status: spec.status };
}

export function sendProblem(
  reply: FastifyReply,
  slug: ProblemSlug,
): FastifyReply {
  const body = problemBody(slug);
  return reply.status(body.status).type('application/problem+json').send(body);
}

/**
 * The single error handler. Anything thrown anywhere becomes a problem
 * document here, and an unrecognised error becomes a bare 500 rather than a
 * stack trace — a leaked stack is an information disclosure, and Fastify's
 * default handler will happily send one.
 */
/**
 * Did the framework reject the request before the handler ran?
 *
 * ── A DEFECT IN ADR-014's ERROR CONTRACT, NOT A DETAIL OF ONE ROUTE ─────────
 *
 * Without this, the handler below turned everything it did not recognise into a
 * 500, so **any malformed request was an internal server error**.
 * `GET /v1/businesses/not-a-uuid` had answered 500 since PR 2b and nothing
 * noticed, because no test had ever sent a bad one. ADR-014 promises RFC 9457
 * problem documents with stable, machine-readable slugs; answering 500 to a
 * client mistake breaks that promise for every route at once, and tells the
 * Flutter client to retry something that can never succeed.
 *
 * ── WHY THE STATUS CODE, NOT THE ERROR CODE ─────────────────────────────────
 *
 * The first version of this matched `FST_ERR_VALIDATION` and a `validation`
 * array — and that was still wrong, which is why it is written this way now.
 * Measured against this Fastify version:
 *
 *   body fails the schema   FST_ERR_VALIDATION            400  validation[]  ✓
 *   params fail the schema  FST_ERR_VALIDATION            400  validation[]  ✓
 *   body is malformed JSON  FST_ERR_CTP_INVALID_JSON_BODY 400  NO validation ✗
 *
 * That third row is the whole point: it carries no `validation` array, so a
 * code-matching check let it through to the 500 branch. Every one of these is
 * already a well-formed 4xx by the time it reaches here — the framework knows
 * what it is — so the honest rule is to trust the status the framework set and
 * translate it into the contract's vocabulary. A future Fastify error code we
 * have never heard of is then handled correctly by default rather than
 * incorrectly.
 */
function clientErrorSlug(error: unknown): ProblemSlug | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  const status = (error as { statusCode?: unknown }).statusCode;
  if (typeof status !== 'number' || status < 400 || status >= 500) {
    return undefined;
  }

  if (status === 404) return 'not-found';
  if (status === 429) return 'rate-limited';
  return 'validation-failed';
}

export function registerProblemHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request: FastifyRequest, reply) => {
    // ProblemError first: it is ours, it already names its slug, and it must
    // not be reinterpreted by a status-code heuristic.
    if (!(error instanceof ProblemError)) {
      const slug = clientErrorSlug(error);
      if (slug !== undefined) {
        // The message can name a field and its constraint; it is LOGGED, never
        // sent. `password must contain at least 8 character(s)` in a response
        // body would be harmless — the same line about an email format is not,
        // once it starts quoting the value back.
        request.log.info(
          {
            slug,
            detail:
              error instanceof Error ? error.message : 'malformed request',
          },
          'request refused: malformed',
        );
        sendProblem(reply, slug);
        return;
      }
    }

    if (error instanceof ProblemError) {
      request.log.info(
        { slug: error.slug, detail: error.message },
        'request refused',
      );
      sendProblem(reply, error.slug);
      return;
    }

    request.log.error({ err: error }, 'unhandled error');
    sendProblem(reply, 'internal-error');
  });

  // A route that does not exist is `not-found`, the same slug a scoped read
  // uses when the caller may not see the row. See auth.ts.
  app.setNotFoundHandler((_request, reply) => {
    sendProblem(reply, 'not-found');
  });
}
