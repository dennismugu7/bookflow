import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Executor } from '../../platform/db.ts';
import type { GoTrueClient } from '../../platform/gotrue.ts';
import type { BreachChecker } from '../../platform/pwned.ts';
import {
  SIGNUP_ACCEPTED,
  signupAcceptedSchema,
  signupRequestSchema,
} from './auth.schema.ts';
import { signUp } from './auth.service.ts';

/** Knows HTTP. Parses, calls the service, serialises. No logic. */

export function registerAuthRoutes(
  app: FastifyInstance,
  db: () => Executor,
  gotrue: GoTrueClient,
  breachChecker: BreachChecker,
): void {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/auth/signup',
    {
      // ── THE ONLY DECISION THIS ROUTE MAKES ────────────────────────────────
      //
      // Explicitly public, per the default-deny rule in `platform/auth.ts`.
      // Sign-up cannot require a token — the caller has no account yet, which
      // is the point — so this is one of the few routes that must opt out, and
      // saying so here is the only way it happens (CLAUDE.md §5).
      config: { public: true },
      schema: {
        operationId: 'signUp',
        summary: 'Create an owner account',
        description:
          'Mediated sign-up (ADR-037). The client never calls GoTrue directly. Creates the account, records terms acceptance with a SERVER-supplied version, and asks GoTrue to send its own activation email. Answers identically whether or not the address already has an account.',
        tags: ['auth'],
        body: signupRequestSchema,
        // 202, not 201: nothing usable exists yet. The account cannot be logged
        // into until the address is confirmed, so this reports acceptance of
        // the request rather than creation of a usable resource.
        response: { 202: signupAcceptedSchema },
      },
    },
    async (request, reply) => {
      // Zod has already run — `fastify-type-provider-zod` validates the body
      // against the schema above BEFORE this handler is entered, so nothing
      // below has to re-check shape, and a malformed request never reaches
      // GoTrue. A validation failure becomes a 400 problem document in
      // `platform/problem.ts`.
      await signUp(
        { gotrue, db: db(), log: request.log, breachChecker },
        request.body,
      );

      // One frozen body for every outcome that is not an error — see
      // `auth.schema.ts`. Built once so success and duplicate cannot drift
      // apart in a later edit.
      return await reply.status(202).send(SIGNUP_ACCEPTED);
    },
  );
}
