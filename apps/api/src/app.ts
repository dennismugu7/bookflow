import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

import { auth } from './platform/auth.ts';
import type { Config } from './platform/config.ts';
import type { Executor } from './platform/db.ts';
import { createGoTrueClient, type GoTrueClient } from './platform/gotrue.ts';
import { createJwtVerifier, type JwtVerifier } from './platform/jwt.ts';
import { createBreachChecker, type BreachChecker } from './platform/pwned.ts';
import { registerProblemHandler } from './platform/problem.ts';
import {
  registerAuthRoutes,
  type SignupRateLimit,
} from './modules/auth/auth.routes.ts';
import { registerBusinessRoutes } from './modules/businesses/businesses.routes.ts';
import { registerMeRoutes } from './modules/me/me.routes.ts';

/**
 * The health response, declared once.
 *
 * This single Zod object is what the runtime serialiser validates against AND
 * what @fastify/swagger turns into the OpenAPI schema — not two descriptions
 * of the same thing kept in step by hand. That is the whole mechanism ADR-014
 * rests on: TypeScript and Dart share no type system, so generation from one
 * declaration is the only thing that stops the contract drifting silently
 * until it fails on a user's phone.
 */
export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .describe('Liveness response.')
  // `id` promotes this into components/schemas, so the generated Dart type is
  // `HealthResponse` rather than a positional name derived from the route and
  // status code. Generated code is read by people; what it is called matters.
  .meta({ id: 'HealthResponse' });

/**
 * Builds the Fastify instance and returns it without listening.
 *
 * Construction and listening are separate so that tests can drive the app via
 * `.inject()` without binding a port, so the spec generator can build the app
 * without starting a server, and so the worker process (ADR-013) can share the
 * same service layer without an HTTP listener.
 *
 * Configuration is passed in rather than read from `process.env` here: the
 * environment is parsed once, at the entry point, and everything downstream
 * receives an already-validated value (see `platform/config.ts`).
 */
export interface BuildAppOptions {
  /**
   * The database executor routes receive. A function so the caller controls
   * lifetime — a request in production, a rolled-back transaction in tests.
   */
  readonly db: () => Executor;
  /** Injected so tests can verify against their own keys. */
  readonly verifier?: JwtVerifier;
  /**
   * Injected so a test can point sign-up at a GoTrue that fails in a chosen
   * way. The default talks to the real one.
   */
  readonly gotrue?: GoTrueClient;
  /**
   * Injected so tests can serve the range API's wire format locally, and so a
   * test can point it at an unreachable host to prove sign-up fails open.
   * The default talks to haveibeenpwned.
   */
  readonly breachChecker?: BreachChecker;
  /**
   * Overrides the sign-up throttle. Present because the limiter's store is
   * in-memory and therefore PER INSTANCE: a test file sharing one app would
   * otherwise couple unrelated tests together through a hidden counter, and the
   * failure would look like a flake. Defaults to `SIGNUP_RATE_LIMIT`.
   */
  readonly signupRateLimit?: SignupRateLimit;
  /**
   * Where the logger writes. Injected so a test can ASSERT on a log line.
   *
   * Present for one reason: the rate limiter's rejection event is the only
   * signal that the CGNAT trigger has fired, and an unasserted log line is
   * exactly the thing that stops working without anyone noticing — which is
   * the failure this event exists to prevent.
   */
  readonly logStream?: NodeJS.WritableStream;
}

export async function buildApp(
  config: Config,
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      // Verbose locally, quiet in the environments where request volume is
      // real. ADR-023's three environments, applied to the one thing this
      // skeleton actually has.
      level: config.APP_ENV === 'local' ? 'info' : 'warn',
      ...(options.logStream === undefined ? {} : { stream: options.logStream }),
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Bookflow API',
        version: '0.0.0',
        description:
          'Generated from the Zod route schemas in apps/api. Never hand-written (ADR-014, ADR-025).',
      },
    },
    transform: jsonSchemaTransform,
    // Without this, a schema carrying an `id` emits a `$ref` into
    // components/schemas and nothing ever puts the schema there — a dangling
    // reference that openapi-generator resolves to an empty model. Caught by
    // reading the generated spec, which is why the spec is committed.
    transformObject: jsonSchemaTransformObject,
  });

  // `global: false` — no route is throttled unless it asks. Default-deny is the
  // right default for AUTHENTICATION (platform/auth.ts); it is the wrong one
  // here, because a limit applied silently to every route is a limit nobody
  // sized for any of them. Routes that need one declare it, and say why.
  //
  // Registered BEFORE the problem handler is irrelevant to correctness — the
  // plugin throws a 429 into whatever error handler is installed — but the
  // handler is what makes the response RFC 9457, so the two belong together.
  await app.register(fastifyRateLimit, { global: false });

  registerProblemHandler(app);

  await app.register(auth, {
    verifier:
      options.verifier ??
      createJwtVerifier({
        supabaseUrl: config.SUPABASE_URL,
        audience: config.SUPABASE_JWT_AUDIENCE,
      }),
  });

  // Unversioned by rule, not by preference: the ADR-014 amendment puts
  // liveness and readiness probes outside the `/v1` surface. Their consumer is
  // infrastructure rather than a client, and a probe has to answer when the
  // versioned surface cannot.
  //
  // `public: true` is the opt-OUT from authentication. Default-deny means this
  // is the only route that needs to say anything (see platform/auth.ts).
  app.get(
    '/health',
    {
      config: { public: true },
      schema: {
        operationId: 'getHealth',
        summary: 'Liveness probe',
        description:
          'Reports that the process is up and answering. Deliberately says nothing about the environment, the version or the database — this endpoint is unauthenticated.',
        tags: ['health'],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    () => {
      return { status: 'ok' as const };
    },
  );

  registerAuthRoutes(
    app,
    options.db,
    options.gotrue ??
      createGoTrueClient({
        baseUrl: config.SUPABASE_URL,
        serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: config.SUPABASE_ANON_KEY,
      }),
    options.breachChecker ?? createBreachChecker(),
    options.signupRateLimit,
  );
  registerMeRoutes(app, options.db);
  registerBusinessRoutes(app, options.db);

  return app;
}
