import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { JwtError, type JwtVerifier, type Principal } from './jwt.ts';
import { ProblemError } from './problem.ts';

/**
 * Authentication as a property of a route's declaration, not of remembering to
 * call something.
 *
 * ── DEFAULT DENY ────────────────────────────────────────────────────────────
 * Every route is authenticated unless it declares `config: { public: true }`.
 *
 * The alternative — an opt-IN `protected: true` — was rejected. Both are
 * declarative, but they fail in opposite directions: forgetting to opt in
 * publishes data, and forgetting to opt out breaks a route loudly in the first
 * test that calls it. The failure mode you get by forgetting should be the one
 * that is safe and obvious, and the one that is safe here is "everything is
 * locked".
 *
 * That also means adding a route is not an authorization decision by default.
 * Making something public is.
 */

declare module 'fastify' {
  interface FastifyRequest {
    /** Set only on authenticated routes. `sub` and nothing else (see jwt.ts). */
    principal?: Principal;
  }
  interface FastifyContextConfig {
    /** Opt a route OUT of authentication. Absent means authenticated. */
    public?: boolean;
  }
}

function bearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || header === '') {
    throw new ProblemError('missing-token', 'no Authorization header');
  }
  const [scheme, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || rest.length === 0) {
    throw new ProblemError(
      'missing-token',
      'Authorization is not a Bearer token',
    );
  }
  return rest.join(' ').trim();
}

export interface AuthPluginOptions {
  readonly verifier: JwtVerifier;
}

function authPlugin(app: FastifyInstance, options: AuthPluginOptions): void {
  app.decorateRequest('principal', undefined);

  app.addHook('onRequest', async (request) => {
    if (request.routeOptions.config.public === true) {
      return;
    }

    const token = bearerToken(request);

    try {
      request.principal = await options.verifier.verify(token);
    } catch (error) {
      if (error instanceof JwtError) {
        // The failure slug maps one-to-one onto a problem slug, so the client
        // can tell "log in again" from "refresh your token" without parsing a
        // message (ADR-014).
        throw new ProblemError(error.failure, error.message);
      }
      throw error;
    }
  });
}

export const auth = fp(authPlugin, { name: 'auth' });

/**
 * The authenticated principal, or a thrown error.
 *
 * Routes call this rather than reading `request.principal` directly, so that a
 * route on a public path which nonetheless expects a user fails loudly instead
 * of reading `undefined`.
 */
export function principalOf(request: FastifyRequest): Principal {
  if (request.principal === undefined) {
    throw new ProblemError(
      'missing-token',
      'route required a principal but is not authenticated',
    );
  }
  return request.principal;
}
