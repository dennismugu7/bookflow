import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import { ProblemError } from '../../platform/problem.ts';
import {
  businessRepository,
  findBusinessForUser,
} from './businesses.repository.ts';
import {
  createBusinessRequestSchema,
  renameBusinessRequestSchema,
} from './businesses.schema.ts';
import {
  createMyBusiness,
  getMyBusiness,
  logScopedMiss,
  renameMyBusiness,
} from './businesses.service.ts';

/** Knows HTTP. Parses, calls the repository, serialises. No logic. */

/**
 * ══ THE WHOLE OWNER-VISIBLE BUSINESS, AND WHY IT IS WORTH SAYING SO ══════════
 *
 * This used to be `{id, name, published}`, and the omissions were not neutral —
 * **each one grew a workaround in the Flutter app that outlived its reason.**
 *
 *   - `handle` was returned only by `POST /v1/me/business/publish`, so the
 *     dashboard learned its own booking address by calling a POST on a read
 *     path. Idempotent by design, so it was safe, and it had an edge it could
 *     not cover: a published salon whose services were all deleted fails the
 *     requirements check and answers 409 instead of handing back its handle.
 *
 *   - The five profile fields were absent, so the edit form could not prefill.
 *     Its workaround was subtler and worse: **blank had to mean "leave
 *     unchanged"**, because a form that cannot show a stored tagline must not
 *     wipe one the owner cannot see. The cost was that nothing could ever be
 *     cleared, and the form carried a line of apology explaining it.
 *
 * Both are gone now, and the general lesson is the one worth keeping: a read
 * that returns less than the resource does not merely omit — it pushes the
 * missing state into the client as a guess, and the guess hardens.
 *
 * **Every field but `id`, `name` and `published` is nullable**, which is the
 * column shape: the profile fields are optional on screen #5, and businesses
 * created before them exist.
 */
export const businessSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    published: z.boolean(),
    /**
     * Null until the salon is published, and permanent from that moment
     * (ADR-021: a rename retires a handle, nothing reassigns one).
     */
    handle: z.string().nullable(),
    tagline: z.string().nullable(),
    about: z.string().nullable(),
    category: z.string().nullable(),
    address: z.string().nullable(),
    mapsUrl: z.string().nullable(),
    /**
     * ── READ-ONLY ON THIS SURFACE, AND DELIBERATELY ASYMMETRIC ──────────────
     *
     * `bannerUrl` is here and is **absent from `RenameBusinessRequest`**. That
     * asymmetry is the point: `POST /v1/me/business/images` writes
     * `banner_url` when the purpose is `banner`, so by the time a client could
     * send it the column is already set. A field on the PATCH would be a
     * second writer for one column, and the two writers would disagree the
     * first time an upload succeeded and the save that followed it failed.
     *
     * So the client shows this and never sends it.
     */
    bannerUrl: z.string().nullable(),
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
        //
        // The distinction the RESPONSE withholds is recorded in the log, where
        // it costs the caller nothing and tells an operator whether this is a
        // stale id or a real one in the wrong hands. See `logScopedMiss`.
        await logScopedMiss(db(), request.log, { userId, businessId });
        throw new ProblemError('not-found', 'no such business for this user');
      }

      return business;
    },
  );

  // ── POST /v1/businesses ───────────────────────────────────────────────────
  //
  // 201, not 202. `auth.routes.ts` answers 202 to sign-up because "nothing
  // usable exists yet"; here something does — the business is readable
  // immediately — so the ordinary 201 applies.
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/businesses',
    {
      schema: {
        operationId: 'createBusiness',
        summary: "Create the caller's business",
        description:
          "Creates the business and the caller's owner membership in one statement, so neither can exist without the other. An account may hold only one business (ADR-003): a second attempt is refused with 409 business-already-exists and writes nothing. The name is trimmed before it is stored.",
        tags: ['businesses'],
        body: createBusinessRequestSchema,
        response: { 201: businessSchema },
      },
    },
    async (request, reply) => {
      const { userId } = principalOf(request);
      // Zod has already run, so `name` arrives trimmed (decision 9).
      const { name } = request.body;

      // `request.log` rather than the app logger: it carries `reqId`, so a
      // conflict event can be joined to the request that caused it. The
      // repository is the real one here and always is — the port exists so a
      // TEST can supply a different one, exactly as `SignupDeps.gotrue` does.
      const business = await createMyBusiness(
        { db: db(), log: request.log, repository: businessRepository },
        { userId },
        name,
      );

      // The service throws `business-already-exists` for the conflict, from
      // either the pre-check or the index, so this handler has no conflict
      // branch of its own — there is one place that decision lives.
      return await reply.code(201).send(business);
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
        summary: 'Edit a business the caller belongs to',
        description:
          'The name is required. tagline, about, category, address and mapsUrl are optional: an OMITTED one is left unchanged, an EMPTY one clears it to null. bannerUrl is returned by this endpoint but cannot be sent — the image upload route is the only writer of that column. Scoped through membership: a business the caller has no membership in is indistinguishable from one that does not exist. Text is trimmed before it is stored.',
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
      const { name, tagline, about, category, address, mapsUrl } = request.body;

      const business = await renameMyBusiness(
        db(),
        { userId, businessId },
        { name, tagline, about, category, address, mapsUrl },
      );

      if (business === undefined) {
        // The same 404 as the read above, for the same reason: a distinct 403
        // would confirm which business ids exist. The repository already
        // refuses to distinguish "not yours" from "does not exist" — the
        // membership predicate is inside the UPDATE's `where`, so a business
        // that is not the caller's simply matches no row.
        //
        // Logged with the same distinction as the read, for the same reason: a
        // rename aimed at somebody else's business is worth being able to count.
        await logScopedMiss(db(), request.log, { userId, businessId });
        throw new ProblemError('not-found', 'no such business for this user');
      }

      return business;
    },
  );
}
