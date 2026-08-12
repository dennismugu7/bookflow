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
export function registerProblemHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request: FastifyRequest, reply) => {
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
