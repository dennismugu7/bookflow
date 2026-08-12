import { describe, expect, it } from 'vitest';

import { getConfig } from '../../src/platform/config.ts';

/**
 * The seed fixture, tested by USING it rather than by counting it.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * `supabase/seed.sql` shipped in PR 1 with a bug that made the seeded user
 * unable to log in at all: GoTrue scans `auth.users` token columns into Go
 * `string`, and the NULLs the seed left produced
 *
 *   Database error querying schema
 *   sql: Scan error on column index 3, name "confirmation_token":
 *   converting NULL to string is unsupported
 *
 * which reads like a schema fault and was a fixture fault.
 *
 * **Every suite passed the entire time.** The seed was verified by counting
 * rows — one user, one profile, one business, one membership — and the counts
 * were all correct. A count proves a row exists. It does not prove the row is
 * usable, and "usable" was the only property anyone actually wanted from it.
 *
 * So this asserts the fixture does the thing it exists to do.
 */

const config = getConfig();
const AUTH_BASE = `${config.SUPABASE_URL.replace(/[/]+$/, '')}/auth/v1`;

describe('the seeded owner is a working account, not just rows', () => {
  it('signs in with the documented credentials and receives a token', async () => {
    const response = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.SUPABASE_ANON_KEY ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@bookflow.test',
        password: 'password123',
      }),
    });

    const body = (await response.json()) as {
      access_token?: string;
      msg?: string;
      error_description?: string;
    };

    expect(
      response.status,
      `the seeded credentials must obtain a token; GoTrue said: ${
        body.msg ?? body.error_description ?? JSON.stringify(body)
      }`,
    ).toBe(200);

    expect(typeof body.access_token).toBe('string');
  });

  it('the token it issues names the seeded user', async () => {
    // Not merely "a token came back" — the right one. A fixture that logs in as
    // somebody else would satisfy the test above.
    const response = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.SUPABASE_ANON_KEY ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@bookflow.test',
        password: 'password123',
      }),
    });

    const body = (await response.json()) as { access_token?: string };
    const token = body.access_token ?? '';
    expect(token).not.toBe('');

    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString(),
    ) as Record<string, unknown>;

    expect(payload['sub']).toBe('00000000-0000-4000-8000-000000000001');
    expect(payload['email']).toBe('owner@bookflow.test');
  });

  it('refuses the wrong password — the fixture is not an open door', async () => {
    const response = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.SUPABASE_ANON_KEY ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@bookflow.test',
        password: 'not-the-password',
      }),
    });

    expect(response.status).toBe(400);
  });
});
