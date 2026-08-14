import type { FastifyInstance, FastifyRequest } from 'fastify';
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

/**
 * ── THROTTLE (per IP) ───────────────────────────────────────────────────────
 *
 * This endpoint is **unauthenticated**, it **writes to the database**, and it
 * **causes email to be sent**. Nothing else in the API is all three, and until
 * this existed nothing throttled it at all.
 *
 * **GoTrue's own rate limiting does not apply.** ADR-037 requires the
 * service-role admin API, and that path bypasses GoTrue's limits exactly as it
 * bypasses its password policy — observed while building this slice: seven
 * consecutive `POST /admin/users` calls in under a second, all HTTP 200, with
 * `[auth.rate_limit] sign_in_sign_ups = 30` per five minutes configured. That
 * setting governs the PUBLIC endpoints, which ADR-037 has closed.
 *
 * ── WHY TEN PER HOUR ────────────────────────────────────────────────────────
 *
 * **A real person signs up once.** The ceiling is not sized for normal use; it
 * is sized for how wrong a legitimate attempt can go before the person gives
 * up. Each of these consumes one request and is genuinely common: a typo in the
 * address, a password under eight characters, a password the breach corpus
 * rejects, a mistyped confirmation. Ten leaves room for all of that twice over
 * and still refuses anything that looks like a script.
 *
 * **The email quota sets the upper bound.** Resend allows 30 per hour on the
 * current plan, and burning it means real sign-ups fail silently. Ten per hour
 * per IP means a single source can consume at most a third of it — and only
 * with ten SUCCESSFUL creations, since a rejected request sends nothing.
 *
 * ── WHAT THIS DOES NOT FIX, STATED PLAINLY ──────────────────────────────────
 *
 * **The store is in-memory, so the limit is per INSTANCE, not per deployment.**
 * ADR-024 runs the API as a Fly.io process group; the moment there is more than
 * one machine, the effective ceiling is ten times the instance count, and a
 * restart resets every counter.
 *
 * **Per-IP is defeated by distributed sources.** Anyone with a botnet, a proxy
 * pool or a handful of cloud instances walks around this completely. It raises
 * the cost of casual abuse from nothing to slightly more than nothing; it is
 * not a defence against someone who means it.
 *
 * **And it can punish the innocent.** ADR-005 puts v1 in Kenya, where mobile
 * carriers use carrier-grade NAT: a large number of real users share one public
 * address. Ten per hour is a per-carrier-pool budget, not a per-person one.
 *
 * **What would fix it properly**, when it needs fixing:
 *
 *   • a SHARED store (Redis) so the limit is per deployment rather than per
 *     instance — the plugin supports this and it is a configuration change,
 *     not a rewrite; and/or
 *   • a **per-address attempt table** in our own database, which is the only
 *     thing that survives both multiple instances and a rotating source IP,
 *     and which also gives the per-address throttle GoTrue is not applying.
 *
 * ── HOW THE TRIGGER IS ACTUALLY OBSERVED ────────────────────────────────────
 *
 * Every rejection logs **`event: 'signup.rate_limited'`** at WARN. That event
 * IS the trigger; nothing else would report it. A throttled owner sees a
 * failure and leaves — they do not file a bug saying "your rate limiter is
 * mis-sized for carrier NAT" — so a trigger phrased as "the first legitimate
 * 429 from a real user" would have waited on a signal that never arrives.
 *
 * The payload carries what is needed to tell the two cases apart:
 *
 *   • **Casual abuse** — many events, one `ip`, seconds apart, `userAgent`
 *     absent or a generic HTTP client. The limit is working; do nothing.
 *   • **CGNAT** — a handful of events on one `ip`, spread across the window,
 *     carrying the Flutter app's user agent, and RECURRING on different days.
 *     That is real users sharing a carrier address, and it is the trigger:
 *     move to a per-address attempt table, because raising the per-IP ceiling
 *     to fit a carrier pool is the same as not having one.
 *
 * **Triggers for doing the proper fix, whichever comes first:** the API running
 * more than one instance; `signup.rate_limited` showing the CGNAT shape above;
 * or `signup.rate_limited` showing sustained abuse. Until one of those, a
 * shared store is infrastructure bought for a threat this project has not met.
 */
export const SIGNUP_RATE_LIMIT = {
  max: 10,
  timeWindow: '1 hour',
} as const;

export interface SignupRateLimit {
  readonly max: number;
  readonly timeWindow: string;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  db: () => Executor,
  gotrue: GoTrueClient,
  breachChecker: BreachChecker,
  rateLimit: SignupRateLimit = SIGNUP_RATE_LIMIT,
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
      //
      // The throttle is declared here, beside the `public: true` that makes it
      // necessary. A rejection is thrown with `statusCode: 429`, which the one
      // error handler in `platform/problem.ts` turns into the RFC 9457
      // `/problems/rate-limited` document — so this endpoint does NOT get a
      // bespoke error body, and the plugin's `Retry-After` header survives.
      config: {
        public: true,
        rateLimit: {
          ...rateLimit,
          /**
           * Fires before the 429 is sent. This is the observability the
           * residual-risk note above depends on — see its "how the trigger is
           * actually observed" section for how to read these fields.
           */
          onExceeded: (request: FastifyRequest, key: string): void => {
            request.log.warn(
              {
                // Stable. Alerts and searches key on this string.
                event: 'signup.rate_limited',
                // What the limiter counted. Equal to `ip` under the default
                // key generator, and logged separately so that changing the
                // key generator does not silently change what this means.
                key,
                ip: request.ip,
                // The strongest single discriminator available here: the
                // Flutter client sends a consistent agent, most scripts do
                // not. Truncated — it is attacker-controlled input, and an
                // unbounded one goes straight into the log pipeline.
                userAgent: (request.headers['user-agent'] ?? '').slice(0, 120),
                max: rateLimit.max,
                window: rateLimit.timeWindow,
              },
              'signup: per-IP rate limit exceeded',
            );
          },
        },
      },
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
