import Fastify, { type FastifyInstance } from 'fastify';

import type { Config } from './platform/config.ts';

/**
 * Builds the Fastify instance and returns it without listening.
 *
 * Construction and listening are separate so that tests can drive the app via
 * `.inject()` without binding a port, and so the worker process (ADR-013) can
 * share the same service layer without starting an HTTP server.
 *
 * Configuration is passed in rather than read from `process.env` here: the
 * environment is parsed once, at the entry point, and everything downstream
 * receives an already-validated value (see `platform/config.ts`).
 */
export function buildApp(config: Config): FastifyInstance {
  const app = Fastify({
    logger: {
      // Verbose locally, quiet in the environments where request volume is
      // real. ADR-023's three environments, applied to the one thing this
      // skeleton actually has.
      level: config.APP_ENV === 'local' ? 'info' : 'warn',
    },
  });

  // Deliberately static and deliberately dull. It reports that the process is
  // up and answering — nothing about the environment, the version or the
  // database, because this endpoint is unauthenticated.
  app.get('/health', () => {
    return { status: 'ok' };
  });

  return app;
}
