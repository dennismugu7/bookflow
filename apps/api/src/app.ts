import Fastify, { type FastifyInstance } from 'fastify';

/**
 * Builds the Fastify instance and returns it without listening.
 *
 * Construction and listening are separate so that tests can drive the app via
 * `.inject()` without binding a port, and so the worker process (ADR-013) can
 * share the same service layer without starting an HTTP server.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  app.get('/health', () => {
    return { status: 'ok' };
  });

  return app;
}
