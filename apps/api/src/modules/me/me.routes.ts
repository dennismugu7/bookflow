import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import type { GoTrueClient } from '../../platform/gotrue.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { StorageClient } from '../../platform/storage.ts';
import { findProfileByUserId, type ProfileRow } from './me.repository.ts';
import {
  deleteAccountRequestSchema,
  updateProfileRequestSchema,
} from './me.schema.ts';
import { deleteMyAccount, renameMe } from './me.service.ts';

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
  deps: {
    readonly gotrue: Pick<GoTrueClient, 'deleteUser'>;
    readonly storage: Pick<StorageClient, 'remove' | 'publicUrl'>;
  },
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

      return toProfile(profile);
    },
  );

  // ── PATCH /v1/me ──────────────────────────────────────────────────────────
  //
  // Screen #20's Edit toggle on the personal-details card.
  //
  // **Both names are required**, which makes this a PATCH that behaves like a
  // PUT over the two fields it covers — and that is deliberate. The alternative
  // is optional fields with "absent means unchanged", which `businesses.routes`
  // needs because its form edits one section at a time. This form edits two
  // adjacent inputs and always has both in hand, and neither can be null in the
  // database. Optionality here would buy nothing and add a state to reason
  // about.
  //
  // The email is NOT here. It is GoTrue's (ADR-027 owns auth email), and
  // changing it is a verification flow rather than a field edit — screen #20
  // renders it read-only for that reason.
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/v1/me',
    {
      schema: {
        operationId: 'updateMe',
        summary: 'Edit the authenticated owner’s own name',
        description:
          'Both names are required and are trimmed before storage. The email address is not editable here — it belongs to Supabase Auth and changing it is a verification flow. The avatar is not editable here either; the upload does not exist yet.',
        tags: ['me'],
        body: updateProfileRequestSchema,
        response: { 200: profileSchema },
      },
    },
    async (request) => {
      const { userId } = principalOf(request);
      // Zod has run before this handler, so both names arrive trimmed and
      // non-empty. A malformed body is a 400 problem document already.
      const { firstName, lastName } = request.body;

      return toProfile(
        await renameMe(db(), { userId }, { firstName, lastName }),
      );
    },
  );

  // ── DELETE /v1/me ─────────────────────────────────────────────────────────
  //
  // Screens #25–#27. Irreversible, and the ordering that makes it recoverable
  // when it half-fails is argued in `deleteMyAccount` — read that before
  // changing anything here.
  //
  // **204, with no body.** There is nothing to return: the resource is gone,
  // and the caller's token is about to stop resolving. A body describing what
  // was deleted would be a receipt for an account that no longer exists.
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/v1/me',
    {
      schema: {
        operationId: 'deleteMe',
        summary: 'Delete the authenticated owner’s account',
        description:
          'Irreversible. Deletes the caller’s business and everything it owns in one transaction, then its storage objects (best-effort — a storage failure is logged and does not stop the deletion), then the profile, then the Supabase Auth user LAST so that a partial failure leaves an account that can retry rather than one that cannot sign in. An optional reason is written to the structured log and is never stored. Answers 204.',
        tags: ['me'],
        body: deleteAccountRequestSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const { userId } = principalOf(request);

      await deleteMyAccount(
        {
          db: db(),
          gotrue: deps.gotrue,
          storage: deps.storage,
          // `request.log` rather than the app logger: it carries `reqId`, so
          // every step of one deletion can be joined back together.
          log: request.log,
        },
        { userId },
        request.body.reason,
      );

      // `send(null)` rather than `send()`: the response schema is `z.null()`,
      // and the serialiser is given a value rather than left to infer one from
      // an absent argument.
      return await reply.code(204).send(null);
    },
  );
}

function toProfile(profile: ProfileRow): {
  id: string;
  firstName: string;
  lastName: string;
  avatarPath: string | null;
} {
  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatarPath: profile.avatar_path,
  };
}
