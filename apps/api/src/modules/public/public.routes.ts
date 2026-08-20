import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import { publicSalonSchema } from './public.schema.ts';
import { findPublishedSalon } from './public.repository.ts';

/** Knows HTTP. Parses, calls the repository, serialises. No logic. */

export function registerPublicRoutes(
  app: FastifyInstance,
  db: () => Executor,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/public/salons/:handle',
    {
      // ── THE OPT-OUT FROM AUTHENTICATION, DECLARED ───────────────────────
      //
      // ADR-017 and `platform/auth.ts`: every route is authenticated unless it
      // says otherwise, and this is the whole of saying otherwise. `/health`
      // and sign-up are the precedents.
      //
      // The rule's own argument applies here more sharply than anywhere:
      // "forgetting to opt in publishes data; forgetting to opt out fails the
      // first test that calls the route — and only one of those two mistakes is
      // recoverable." This route publishes data ON PURPOSE, which is exactly
      // why what it publishes is an allowlist (`public.schema.ts`) and why the
      // repository filters on `published`.
      config: { public: true },
      schema: {
        operationId: 'getPublicSalon',
        summary: 'A published salon’s booking page',
        description:
          'Unauthenticated. Returns an allowlist projection — no ids beyond the service and team-member ids booking will reference, no owner, no timestamps. A handle that does not exist and a salon that is not published are the same 404, deliberately: distinguishing them would let anyone enumerate unpublished salons by name.',
        tags: ['public'],
        params: z.object({
          // Matched to `ck_businesses_handle_shape`. A handle that could not
          // have been minted is refused before it reaches the database, so this
          // route cannot be used to probe with arbitrary strings.
          handle: z
            .string()
            .min(3)
            .max(60)
            .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
        }),
        response: { 200: publicSalonSchema },
      },
    },
    async (request) => {
      const salon = await findPublishedSalon(db(), request.params.handle);

      if (salon === undefined) {
        // No log of which of the two it was. `logScopedMiss` records that
        // distinction for OWNER routes, where the caller is authenticated and
        // the fact is operationally useful; here the caller is anonymous and
        // the same line would be a per-request record of strangers guessing
        // names, which is noise rather than signal.
        throw new ProblemError(
          'not-found',
          'no published salon at that handle',
        );
      }

      return salon;
    },
  );
}
