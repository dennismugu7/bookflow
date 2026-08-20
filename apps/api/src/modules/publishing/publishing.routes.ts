import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import { publishedBusinessSchema } from './publishing.schema.ts';
import { publishMyBusiness } from './publishing.service.ts';

/** Knows HTTP. Parses, calls the service, serialises. No logic. */

export function registerPublishingRoutes(
  app: FastifyInstance,
  db: () => Executor,
): void {
  // POST rather than PATCH on the business: publishing is not a field edit. It
  // mints a permanent public address (ADR-021) and turns on every public read,
  // and a route named for what it does is harder to invoke by accident than a
  // boolean in a body.
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/me/business/publish',
    {
      schema: {
        operationId: 'publishMyBusiness',
        summary: 'Publish the salon',
        description:
          'Requires a name, at least one service and at least one open day; otherwise 409 publish-requirements-not-met, which names nothing the caller does not already have. On success the business becomes publicly readable and is assigned a permanent handle (ADR-021), derived from the name with a random suffix on collision. Idempotent: publishing an already-published salon returns the handle it already has and never mints a second.',
        tags: ['publishing'],
        response: { 200: publishedBusinessSchema },
      },
    },
    async (request) => await publishMyBusiness(db(), principalOf(request)),
  );
}
