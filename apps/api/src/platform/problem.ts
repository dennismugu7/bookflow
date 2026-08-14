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
 * Did Fastify (or the Zod type provider) reject the request before the handler
 * ran?
 *
 * This is checked because the handler below turns anything it does not
 * recognise into a 500 — so until this existed, ANY malformed request was an
 * internal server error. `GET /v1/businesses/not-a-uuid` was already a 500
 * before the sign-up endpoint added a request body, and nothing noticed,
 * because no test sent a bad one.
 *
 * Both shapes are matched deliberately: Fastify's own validation errors carry
 * `FST_ERR_VALIDATION`, and `fastify-type-provider-zod` throws its own error
 * type carrying a `validation` array. Matching one and not the other would
 * leave half the inputs answering 500.
 */
function isValidationError(error: unknown): error is { message: string } {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; validation?: unknown };
  return (
    candidate.code === 'FST_ERR_VALIDATION' ||
    Array.isArray(candidate.validation)
  );
}

export function registerProblemHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request: FastifyRequest, reply) => {
    if (isValidationError(error)) {
      // The message can name a field and its constraint; it is logged, never
      // sent. `password must contain at least 8 character(s)` in a response
      // body is harmless — the same line about an email format is not, once it
      // starts quoting the value.
      request.log.info(
        { detail: error.message },
        'request refused: failed validation',
      );
      sendProblem(reply, 'validation-failed');
      return;
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
