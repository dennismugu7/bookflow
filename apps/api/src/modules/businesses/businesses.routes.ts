import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import { ProblemError } from '../../platform/problem.ts';
import { findBusinessForUser } from './businesses.repository.ts';
import { renameBusinessRequestSchema } from './businesses.schema.ts';
import { getMyBusiness, renameMyBusiness } from './businesses.service.ts';

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

  // ── GET /v1/me/business ───────────────────────────────────────────────────
  //
  // The question the client has to ask before it holds any id: "do I have a
  // business, and which one". `GET /v1/me` answers about the profile and
  // `GET /v1/businesses/{id}` needs an id, so neither answers this.
  //
  // ── THE 404 IS A DATA ANSWER, AND THE CLIENT MUST TREAT IT AS ONE ─────────
  //
  // An account with no business is the ORDINARY state of every owner between
  // sign-up and onboarding — not a failure. ADR-014 fixes that a single
  // resource is returned as itself, so there is no `{ business: null }`
  // envelope available without deviating, and `GET /v1/me` already sets the
  // precedent of `not-found` for a missing singleton.
  //
  // The consequence lands on the Flutter side and is the one line the
  // dashboard's error state depends on: the feature repository maps THIS 404
  // to "no business yet" and every other failure to an error. If a 404 were
  // allowed to surface as an `AsyncValue.error`, the dashboard would render its
  // error state for a brand-new account.
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business',
    {
      schema: {
        operationId: 'getMyBusiness',
        summary: "The caller's own business",
        description:
          'Answers "do I have a business, and which one" without needing its id. A 404 means the account has not created one yet — an ordinary state, not an error. Clients must not surface it as a failure.',
        tags: ['me'],
        response: { 200: businessSchema },
      },
    },
    async (request) => {
      const { userId } = principalOf(request);

      const business = await getMyBusiness(db(), { userId });

      if (business === undefined) {
        throw new ProblemError('not-found', 'no business for this principal');
      }

      return business;
    },
  );

  // ── PATCH /v1/businesses/:businessId ──────────────────────────────────────
  //
  // Rename. The name is the only editable field (decision 4) and there is no
  // delete route at all, so "cannot be deleted" is satisfied by absence rather
  // than by a route that refuses.
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/v1/businesses/:businessId',
    {
      schema: {
        operationId: 'renameBusiness',
        summary: 'Rename a business the caller belongs to',
        description:
          'The name is the only editable field. Scoped through membership: a business the caller has no membership in is indistinguishable from one that does not exist. The name is trimmed before it is stored.',
        tags: ['businesses'],
        params: z.object({ businessId: z.uuid() }),
        body: renameBusinessRequestSchema,
        response: { 200: businessSchema },
      },
    },
    async (request) => {
      const { userId } = principalOf(request);
      const { businessId } = request.params;
      // Zod has already run — `fastify-type-provider-zod` validates the body
      // against the schema above BEFORE this handler is entered. So `name`
      // arrives trimmed (decision 9), and a malformed request never reaches the
      // service. A validation failure becomes a 400 problem document in
      // `platform/problem.ts`.
      const { name } = request.body;

      const business = await renameMyBusiness(
        db(),
        { userId, businessId },
        name,
      );

      if (business === undefined) {
        // The same 404 as the read above, for the same reason: a distinct 403
        // would confirm which business ids exist. The repository already
        // refuses to distinguish "not yours" from "does not exist" — the
        // membership predicate is inside the UPDATE's `where`, so a business
        // that is not the caller's simply matches no row.
        throw new ProblemError('not-found', 'no such business for this user');
      }

      return business;
    },
  );
}
