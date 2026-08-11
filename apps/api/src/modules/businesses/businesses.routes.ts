import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import { ProblemError } from '../../platform/problem.ts';
import { findBusinessForUser } from './businesses.repository.ts';

/** Knows HTTP. Parses, calls the repository, serialises. No logic. */

export const businessSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    published: z.boolean(),
  })
  .describe('A business the caller is a member of.')
  .meta({ id: 'Business' });

export function registerBusinessRoutes(
  app: FastifyInstance,
  db: () => Executor,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/businesses/:businessId',
    {
      schema: {
        operationId: 'getBusiness',
        summary: 'A business the caller belongs to',
        description:
          'Scoped through membership: user → membership → business. A business the caller has no membership in is indistinguishable from one that does not exist.',
        tags: ['businesses'],
        params: z.object({ businessId: z.uuid() }),
        response: { 200: businessSchema },
      },
    },
    async (request) => {
      const { userId } = principalOf(request);
      const { businessId } = request.params;

      const business = await findBusinessForUser(db(), { userId, businessId });

      if (business === undefined) {
        // ── THE SAME RESPONSE FOR "does not exist" AND "not yours" ──────────
        //
        // Deliberately identical, not merely both 4xx. A distinct 403 would
        // tell an unauthenticated attacker which business ids exist: iterate
        // ids, and 403 means real while 404 means not. Since ADR-016 makes ids
        // UUIDs precisely so they cannot be enumerated, a status code that
        // confirms existence would hand back the property the id scheme was
        // chosen for.
        //
        // The repository already refuses to distinguish the two — it returns
        // `undefined` for both — so this is not a decision a route can get
        // wrong by accident. `schema.integration.test.ts` asserts the two
        // response bodies are byte-identical, not just both 404.
        throw new ProblemError('not-found', 'no such business for this user');
      }

      return business;
    },
  );
}
