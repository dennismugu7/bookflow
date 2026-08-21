import fastifyCors, {
  type FastifyCorsOptions,
  type FastifyCorsOptionsDelegate,
} from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
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
import { registerBookingRoutes } from './modules/bookings/bookings.routes.ts';
import { registerBusinessRoutes } from './modules/businesses/businesses.routes.ts';
import { registerHoursRoutes } from './modules/hours/hours.routes.ts';
import { registerMediaRoutes } from './modules/media/media.routes.ts';
import { registerMeRoutes } from './modules/me/me.routes.ts';
import { registerPublicRoutes } from './modules/public/public.routes.ts';
import { registerPublishingRoutes } from './modules/publishing/publishing.routes.ts';
import { registerServiceRoutes } from './modules/services/services.routes.ts';
import { registerTeamRoutes } from './modules/team/team.routes.ts';
import { MAX_IMAGE_BYTES } from './modules/media/media.schema.ts';
import {
  createMailer,
  createNoopMailer,
  type Mailer,
} from './platform/resend.ts';
import { createStorageClient, type StorageClient } from './platform/storage.ts';

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
   * Injected so a test can drive the upload path without an object store, and
   * so one can point it at a store that fails in a chosen way. The default
   * talks to the real Supabase Storage.
   */
  readonly storage?: StorageClient;
  /**
   * Injected so a test can assert that a status change dispatched mail — and
   * that a FAILING send still leaves the status changed, which is the rule
   * `DEFINITION_OF_DONE.md` sets and the one worth a test.
   */
  readonly mailer?: Mailer;
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

  // ══ CORS, AND ONLY ON THE PUBLIC SURFACE ══════════════════════════════════
  //
  // `apps/web` is a static site on its own origin; the browser will not let it
  // read a cross-origin response without these headers. Two decisions here, and
  // both are the security-relevant half.
  //
  // ── ANY ORIGIN, FOR `/v1/public/*` AND NOTHING ELSE ──────────────────────
  //
  // A published salon page is public data by construction (ADR-004, ADR-020:
  // the `business_public` allowlist projection). Restricting it to one origin
  // would protect nothing — anyone can `curl` it — while breaking the salon's
  // own page the day it is served from a custom domain.
  //
  // **Every other route stays CORS-closed**, which is not a formality. The
  // authenticated surface is owner data, and CORS is what stops a page the
  // owner happens to have open from reading it with their session. This API's
  // tokens are Bearer rather than cookies, so the exposure is narrower than the
  // classic CSRF case — and `origin: false` outside `/v1/public/` means no
  // browser will make the attempt at all, rather than relying on that.
  //
  // ── THE CHECK IS ON THE PATH, WHICH `@fastify/cors` MAKES AWKWARD ────────
  //
  // The `origin` callback receives the origin, not the request. So the plugin
  // is registered with a `hook: 'onRequest'` delegator: it is handed the
  // request, decides from `req.url`, and returns `origin: false` for anything
  // outside the public prefix. Written this way rather than registering the
  // plugin twice under two prefixes, because a prefix registration would also
  // have to duplicate the preflight handling.
  const corsDelegate: FastifyCorsOptionsDelegate = () => {
    return (
      req: { url?: string },
      callback: (error: Error | null, options: FastifyCorsOptions) => void,
    ): void => {
      // `req.url` carries the query string; the prefix test must not.
      const path = (req.url ?? '').split('?')[0] ?? '';
      const isPublic = path.startsWith('/v1/public/');

      if (!isPublic) {
        // No `access-control-allow-origin` header at all, which is what makes
        // a browser refuse to hand the body to script.
        callback(null, { origin: false });
        return;
      }

      callback(null, {
        origin: true,
        // GET reads the salon and its availability; POST makes the booking.
        // Nothing else on this surface exists, and listing only what exists
        // means a future PATCH here has to be considered rather than inherited.
        methods: ['GET', 'POST', 'OPTIONS'],
        // `content-type` covers both the JSON reads and the multipart booking.
        // **No `authorization`**: a public route never reads one, and allowing
        // the header would invite a client to send a token to an endpoint that
        // ignores it — which is how a token ends up in an access log it has no
        // business being in.
        allowedHeaders: ['content-type'],
        // No credentials. There is no cookie or session on this surface, and
        // `credentials: true` alongside a wildcard origin is the combination
        // browsers refuse anyway.
        credentials: false,
        maxAge: 3600,
      });
    };
  };

  await app.register(fastifyCors, corsDelegate);

  // ── THE SIZE CAP LIVES HERE, AT THE STREAM ────────────────────────────────
  //
  // `fileSize` is enforced while the body arrives, so an oversized upload is
  // cut off mid-flight rather than buffered in full and measured afterwards.
  // Checking `Content-Length` instead would trust a header the client writes.
  //
  // `files: 1` because every route here takes one image. A request carrying
  // ten would otherwise be parsed in full before anything noticed.
  await app.register(fastifyMultipart, {
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  });

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
  registerServiceRoutes(app, options.db);
  registerTeamRoutes(app, options.db);
  registerHoursRoutes(app, options.db);
  // Built once and shared: the media routes and the booking route both upload,
  // and two clients would mean two timeouts and two places to change the bucket.
  const storage =
    options.storage ??
    createStorageClient({
      baseUrl: config.SUPABASE_URL,
      serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
    });

  registerMediaRoutes(app, options.db, storage);
  registerPublishingRoutes(app, options.db);
  registerBookingRoutes(
    app,
    options.db,
    storage,
    options.mailer ??
      // No key configured means the no-op mailer, which LOGS what it would have
      // sent rather than being silent — local and the integration suite have no
      // Resend account and must not need one. `config.ts` makes the key
      // required in production, so this branch cannot be reached there.
      (config.MAIL_PROVIDER_API_KEY === undefined ||
      config.MAIL_FROM_ADDRESS === undefined
        ? createNoopMailer(app.log)
        : createMailer({
            apiKey: config.MAIL_PROVIDER_API_KEY,
            from: config.MAIL_FROM_ADDRESS,
          })),
  );
  // Last, and the only one that is unauthenticated. Registration order does not
  // affect the auth hook — `platform/auth.ts` is default-deny over every route
  // regardless — but keeping the public surface at the bottom of this list
  // means a reader sees the whole authenticated API before the one exception.
  registerPublicRoutes(app, options.db);

  return app;
}
