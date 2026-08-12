import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import { ProblemError } from '../../platform/problem.ts';
import { findProfileByUserId } from './me.repository.ts';

/** Knows HTTP. Parses, calls the repository, serialises. No logic. */

export const profileSchema = z
  .object({
    id: z.uuid(),
    firstName: z.string(),
    lastName: z.string(),
    avatarPath: z.string().nullable(),
  })
  .describe("The authenticated owner's own profile.")
  .meta({ id: 'Profile' });

export function registerMeRoutes(
  app: FastifyInstance,
  db: () => Executor,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me',
    {
      schema: {
        operationId: 'getMe',
        summary: "The authenticated owner's profile",
        description:
          "Screen #20 renders this. Keyed by the caller's own id, so it does not exercise the membership scoping rule — see GET /v1/businesses/{businessId}.",
        tags: ['me'],
        response: { 200: profileSchema },
      },
    },
    async (request) => {
      const { userId } = principalOf(request);
      const profile = await findProfileByUserId(db(), { userId });

      if (profile === undefined) {
        // An authenticated user with no profile row. ADR-037 makes this
        // impossible for accounts created through the mediated sign-up, so it
        // means either a hand-made account or a bug — and either way the
        // caller learns nothing beyond "not found".
        throw new ProblemError('not-found', 'no profile for this principal');
      }

      return {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        avatarPath: profile.avatar_path,
      };
    },
  );
}
