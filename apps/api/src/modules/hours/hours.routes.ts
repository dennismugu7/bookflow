import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import {
  openingHoursSchema,
  replaceOpeningHoursRequestSchema,
} from './hours.schema.ts';
import { getOpeningHours, setOpeningHours } from './hours.service.ts';

/** Knows HTTP. Parses, calls the service, serialises. No logic. */

export function registerHoursRoutes(
  app: FastifyInstance,
  db: () => Executor,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business/opening-hours',
    {
      schema: {
        operationId: 'getMyOpeningHours',
        summary: "The caller's opening hours",
        description:
          'Ascending by day, 0 = Monday. An absent day is CLOSED (A6) — there is no row meaning "shut", only the absence of one.',
        tags: ['opening-hours'],
        response: { 200: openingHoursSchema },
      },
    },
    async (request) => await getOpeningHours(db(), principalOf(request)),
  );

  // PUT, not PATCH. The body IS the week afterwards — a day left out is
  // removed, which is how "closed on Sundays" is expressed. PATCH would promise
  // a merge and there is no merge here.
  app.withTypeProvider<ZodTypeProvider>().put(
    '/v1/me/business/opening-hours',
    {
      schema: {
        operationId: 'replaceMyOpeningHours',
        summary: 'Replace the week',
        description:
          'The submitted array becomes the whole week: days that are absent are removed. Applied in one statement, so a request either lands entirely or not at all — a half-applied week would be a salon open at hours nobody chose. A day may appear at most once and closeTime must be after openTime.',
        tags: ['opening-hours'],
        body: replaceOpeningHoursRequestSchema,
        response: { 200: openingHoursSchema },
      },
    },
    async (request) =>
      await setOpeningHours(db(), principalOf(request), request.body.days),
  );
}
