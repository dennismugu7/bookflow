import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from './config.ts';

/**
 * Unit test. No database, no network, no `process.env` — `loadConfig` takes the
 * environment as an argument precisely so this can be true.
 */

/** Values chosen to be unmistakable if one ever leaks into a message. */
const SECRET_DB_URL = 'postgresql://postgres:hunter2-LEAKED@127.0.0.1:5432/x';
const SECRET_SERVICE_KEY = 'sb_secret_LEAKED_SERVICE_ROLE_VALUE';
const SECRET_MAIL_KEY = 'mail_LEAKED_PROVIDER_KEY';

function validEnv(): Record<string, string> {
  return {
    APP_ENV: 'local',
    DATABASE_URL: SECRET_DB_URL,
    // Required as of the auth slice: jwt.ts derives both the JWKS URI and the
    // expected issuer from it (ADR-017).
    SUPABASE_URL: 'https://project.supabase.co',
    // Both required as of the mediated sign-up slice (ADR-037): the endpoint
    // creates users with the service-role key and sends the activation email
    // through the public `/resend` endpoint with the anon key.
    SUPABASE_ANON_KEY: 'anon-key-not-a-secret',
    SUPABASE_SERVICE_ROLE_KEY: SECRET_SERVICE_KEY,
    MAIL_PROVIDER_API_KEY: SECRET_MAIL_KEY,
    // Added with the bookings slice, which makes both mail variables REQUIRED
    // in production. The key was already here and the From address was not, so
    // the `accepts sslmode=… in production` cases began failing on a missing
    // variable rather than on the thing they assert — which is exactly what a
    // shared fixture is for catching.
    MAIL_FROM_ADDRESS: 'bookings@bookflow.test',
  };
}

describe('loadConfig', () => {
  it('parses a valid environment and applies defaults', () => {
    const config = loadConfig(validEnv());

    expect(config.APP_ENV).toBe('local');
    expect(config.DATABASE_URL).toBe(SECRET_DB_URL);
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('0.0.0.0');
  });

  it('coerces PORT to a number', () => {
    const config = loadConfig({ ...validEnv(), PORT: '8080' });

    expect(config.PORT).toBe(8080);
  });

  it('treats a blank variable as unset, not as an empty value', () => {
    // Copying .env.example to .env leaves every variable empty. That must read
    // as "not filled in", never as an empty password.
    const env = { ...validEnv(), DATABASE_URL: '   ' };

    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it('fails naming a missing required variable', () => {
    const env = validEnv();
    delete env['DATABASE_URL'];

    expect(() => loadConfig(env)).toThrow(ConfigError);

    try {
      loadConfig(env);
      expect.unreachable('loadConfig should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toContain('DATABASE_URL');
      expect((error as ConfigError).message).toContain('is required');
    }
  });

  it('reports every problem at once, by name', () => {
    const error = captureConfigError({ MAIL_FROM_ADDRESS: 'not-an-email' });

    expect(error.message).toContain('APP_ENV');
    expect(error.message).toContain('DATABASE_URL');
    expect(error.message).toContain('SUPABASE_URL');
    expect(error.message).toContain('MAIL_FROM_ADDRESS');
  });

  it('never puts a variable value in the failure message', () => {
    // The property that matters: half of these variables are credentials, and
    // a validation failure is exactly when a careless implementation echoes
    // one. An invalid APP_ENV is the specific trap — Zod's own enum message
    // reports the received value, so this fails if config.ts ever forwards it.
    const error = captureConfigError({
      APP_ENV: 'produciton',
      DATABASE_URL: SECRET_DB_URL,
      SUPABASE_SERVICE_ROLE_KEY: SECRET_SERVICE_KEY,
      MAIL_PROVIDER_API_KEY: SECRET_MAIL_KEY,
      MAIL_FROM_ADDRESS: 'not-an-email',
      SUPABASE_URL: 'https://project.supabase.co',
    });

    expect(error.message).toContain('APP_ENV');
    expect(error.message).not.toContain('produciton');
    expect(error.message).not.toContain(SECRET_DB_URL);
    expect(error.message).not.toContain('hunter2-LEAKED');
    expect(error.message).not.toContain(SECRET_SERVICE_KEY);
    expect(error.message).not.toContain(SECRET_MAIL_KEY);
    expect(error.message).not.toContain('not-an-email');
  });
});

function captureConfigError(env: Record<string, string>): ConfigError {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected loadConfig to throw a ConfigError');
}

describe('production refuses an unverified database connection', () => {
  /**
   * The staging position — `sslmode=no-verify` against Supabase's pooler — is
   * encrypted but does not authenticate the server. It was previously held in
   * place by a comment saying "do not carry into production". This asserts the
   * comment became a condition.
   */
  const noVerify =
    'postgresql://bookflow_api.ref:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

  it('refuses to start in production', () => {
    const env = {
      ...validEnv(),
      APP_ENV: 'production',
      DATABASE_URL: noVerify,
    };

    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it('names DATABASE_URL and points at the tracked fix', () => {
    const env = {
      ...validEnv(),
      APP_ENV: 'production',
      DATABASE_URL: noVerify,
    };

    try {
      loadConfig(env);
      expect.unreachable(
        'production must not start with an unverified connection',
      );
    } catch (error) {
      const problems = (error as ConfigError).problems.join('\n');
      expect(problems).toContain('DATABASE_URL');
      expect(problems).toContain('verify-full');
      // The fix is tracked, and the message says where — otherwise whoever
      // hits this at deploy time will simply add the flag back.
      expect(problems).toContain('K76');
    }
  });

  it('never puts the connection string in the failure message', () => {
    // The same invariant the rest of this file enforces: a config error is
    // exactly the moment a careless implementation echoes a credential.
    const env = {
      ...validEnv(),
      APP_ENV: 'production',
      DATABASE_URL: noVerify,
    };

    try {
      loadConfig(env);
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as ConfigError).message;
      expect(message).not.toContain('pw@');
      expect(message).not.toContain('pooler.supabase.com');
    }
  });

  it.each([
    ['sslmode=disable', 'disable'],
    ['sslmode=allow', 'allow'],
    ['sslmode=prefer', 'prefer'],
    // `require` verifies TODAY, because pg-connection-string maps it to
    // verify-full — and it is warned to adopt libpq semantics, which do not
    // verify, in its next major. Production must not depend on which version
    // of a transitive dependency got installed.
    ['sslmode=require', 'require'],
    ['no sslmode at all', undefined],
  ])('rejects %s in production', (_label, mode) => {
    const base =
      'postgresql://bookflow_api.ref:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
    const env = {
      ...validEnv(),
      APP_ENV: 'production',
      DATABASE_URL: mode === undefined ? base : `${base}?sslmode=${mode}`,
    };

    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it.each([['verify-full'], ['verify-ca']])(
    'accepts sslmode=%s in production',
    (mode) => {
      const env = {
        ...validEnv(),
        APP_ENV: 'production',
        DATABASE_URL: `postgresql://bookflow_api.ref:pw@host:5432/postgres?sslmode=${mode}`,
      };

      expect(loadConfig(env).APP_ENV).toBe('production');
    },
  );

  it('leaves staging alone — the same URL starts', () => {
    // The point of the guard is that it is production-only. Staging keeps the
    // position deliberately, and this is what stops someone "fixing" the guard
    // by widening it until staging cannot boot either.
    const env = { ...validEnv(), APP_ENV: 'staging', DATABASE_URL: noVerify };

    const config = loadConfig(env);
    expect(config.APP_ENV).toBe('staging');
    expect(config.DATABASE_URL).toBe(noVerify);
  });

  it('leaves local alone too', () => {
    const env = { ...validEnv(), APP_ENV: 'local', DATABASE_URL: noVerify };

    expect(loadConfig(env).APP_ENV).toBe('local');
  });
});
