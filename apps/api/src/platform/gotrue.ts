/**
 * The GoTrue admin surface, as a client.
 *
 * ADR-027 puts account records and auth email inside Supabase Auth. This is the
 * only file that talks to it over HTTP, so the rest of the codebase deals in
 * `GoTrueError` and a `failure` slug rather than in status codes and provider
 * error strings.
 *
 * ── WHY THREE CALLS AND NOT ONE ─────────────────────────────────────────────
 *
 * ADR-037 originally described a single server-side call that both creates the
 * user and sends the activation email. **It does not exist.** Spike 002 (L2)
 * measured it: `POST /admin/users` returns 200 with `confirmation_sent_at`
 * null, no mail dispatched, with or without `email_confirm`. The admin path is
 * mute. Re-measured locally on 2026-08-14 against this stack, same result.
 *
 * So creating an account is `createUser` followed by `sendSignupConfirmation`,
 * and the ADR carries a dated amendment saying so. Both are here; neither is
 * useful without the other.
 *
 * ── CREDENTIALS ─────────────────────────────────────────────────────────────
 *
 * Two keys, deliberately not one. The admin calls use the service-role key,
 * which bypasses RLS entirely (spike 001/C7) and must never leave this process.
 * `sendSignupConfirmation` uses the ANON key, because `/resend` is a public
 * endpoint and that is the credential spike 002 verified it with (L6).
 *
 * Neither key is ever logged, echoed into an error, or included in a thrown
 * message. GoTrue's own error bodies are read for a `error_code` and nothing
 * else is propagated.
 */

/** Bounded, because `fetch` has no default timeout — same reasoning as jwt.ts. */
const GOTRUE_TIMEOUT_MS = 10_000;

/**
 * What went wrong, in terms a service can branch on.
 *
 * `email-exists` is load-bearing: `auth.service.ts` answers it with the SAME
 * response as success, so the endpoint cannot be used to test whether an
 * address has an account.
 */
export type GoTrueFailure =
  | 'email-exists'
  | 'password-rejected'
  | 'invalid-email'
  | 'rate-limited'
  | 'unavailable'
  | 'rejected';

export class GoTrueError extends Error {
  readonly failure: GoTrueFailure;
  /** GoTrue's own `error_code`, for the log. Never sent to a client. */
  readonly providerCode: string | undefined;

  constructor(failure: GoTrueFailure, message: string, providerCode?: string) {
    super(message);
    this.name = 'GoTrueError';
    this.failure = failure;
    this.providerCode = providerCode;
  }
}

export interface CreatedUser {
  readonly id: string;
}

export interface GoTrueClient {
  /**
   * Creates the user, and sends NOTHING. See the note above — this silence is
   * the whole reason the sign-up flow has a third step.
   */
  createUser(input: {
    readonly email: string;
    readonly password: string;
  }): Promise<CreatedUser>;

  /** Asks GoTrue to send its own activation email, with its own token. */
  sendSignupConfirmation(email: string): Promise<void>;

  /** The compensating delete (ADR-037). */
  deleteUser(userId: string): Promise<void>;
}

export interface GoTrueClientOptions {
  /** Project origin, e.g. `http://127.0.0.1:54321`. `/auth/v1` is appended. */
  readonly baseUrl: string;
  readonly serviceRoleKey: string;
  readonly anonKey: string;
  readonly timeoutMs?: number;
}

interface ErrorBody {
  error_code?: unknown;
  code?: unknown;
  msg?: unknown;
  error?: unknown;
}

/**
 * Maps a provider response onto a failure slug.
 *
 * Explicit code-by-code, not a status-range heuristic: GoTrue answers 422 for
 * both "that address already has an account" and "that password is too weak",
 * and those two must not be treated alike — one is answered as success and the
 * other is a 400.
 */
function classify(status: number, code: string | undefined): GoTrueFailure {
  switch (code) {
    case 'email_exists':
    case 'user_already_exists':
      return 'email-exists';
    case 'weak_password':
      return 'password-rejected';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'invalid-email';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'rate-limited';
    default:
      return status >= 500 ? 'unavailable' : 'rejected';
  }
}

function providerCodeOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const candidate = body as ErrorBody;
  for (const value of [candidate.error_code, candidate.code, candidate.error]) {
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

export function createGoTrueClient(options: GoTrueClientOptions): GoTrueClient {
  const authBase = `${options.baseUrl.replace(/\/+$/, '')}/auth/v1`;
  const timeoutMs = options.timeoutMs ?? GOTRUE_TIMEOUT_MS;

  async function call(
    path: string,
    init: { method: string; key: string; body?: unknown },
  ): Promise<{ status: number; body: unknown }> {
    // Built up rather than declared inline: `exactOptionalPropertyTypes` means
    // `body: undefined` is not the same as no `body` at all, and a DELETE with
    // an explicit undefined body does not type-check.
    const request: RequestInit = {
      method: init.method,
      headers: {
        apikey: init.key,
        authorization: `Bearer ${init.key}`,
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (init.body !== undefined) {
      request.body = JSON.stringify(init.body);
    }

    let response: Response;
    try {
      response = await fetch(`${authBase}${path}`, request);
    } catch (error) {
      // A network failure, a DNS failure or the timeout above. The URL is safe
      // to name — it is an origin, not a credential — and naming it is the
      // difference between a diagnosable log line and "fetch failed".
      throw new GoTrueError(
        'unavailable',
        `auth provider unreachable at ${authBase}${path}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text === '' ? null : JSON.parse(text);
    } catch {
      body = null;
    }

    return { status: response.status, body };
  }

  return {
    async createUser(input): Promise<CreatedUser> {
      const { status, body } = await call('/admin/users', {
        method: 'POST',
        key: options.serviceRoleKey,
        // `email_confirm` is deliberately NOT set. It makes no difference to
        // whether mail is sent (spike 002 L2 tested both), and setting it true
        // would mark the address confirmed without anyone having confirmed it
        // — which would let an account be used by whoever typed the address.
        body: { email: input.email, password: input.password },
      });

      if (status === 200 || status === 201) {
        const id = (body as { id?: unknown } | null)?.id;
        if (typeof id !== 'string' || id === '') {
          throw new GoTrueError(
            'unavailable',
            'auth provider created a user but returned no id',
          );
        }
        return { id };
      }

      const code = providerCodeOf(body);
      throw new GoTrueError(
        classify(status, code),
        `auth provider refused user creation (HTTP ${String(status)})`,
        code,
      );
    },

    async sendSignupConfirmation(email): Promise<void> {
      const { status, body } = await call('/resend', {
        method: 'POST',
        key: options.anonKey,
        body: { type: 'signup', email },
      });

      if (status === 200) return;

      const code = providerCodeOf(body);
      throw new GoTrueError(
        classify(status, code),
        `auth provider refused to send the confirmation (HTTP ${String(status)})`,
        code,
      );
    },

    async deleteUser(userId): Promise<void> {
      const { status, body } = await call(
        `/admin/users/${encodeURIComponent(userId)}`,
        { method: 'DELETE', key: options.serviceRoleKey },
      );

      // 404 means the user is already gone, which is the state this call exists
      // to reach. Treating it as success keeps compensation idempotent.
      if (status === 200 || status === 204 || status === 404) return;

      const code = providerCodeOf(body);
      throw new GoTrueError(
        classify(status, code),
        `auth provider refused to delete the user (HTTP ${String(status)})`,
        code,
      );
    },
  };
}
