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
