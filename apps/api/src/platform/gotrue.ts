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

  /**
   * Whether this email and password are a valid credential right now.
   *
   * ══ A RE-AUTHENTICATION CHECK, NOT A LOGIN ══════════════════════════════════
   *
   * `DELETE /v1/me` destroys a salon's entire booking history, and a bearer
   * token is valid for up to an hour with no denylist (ADR-017). So the token
   * alone must not be enough: a phone left unlocked for five minutes, or a token
   * lifted from a log, is otherwise a complete and irreversible erasure.
   *
   * **It returns a boolean and never a session.** The caller is already
   * authenticated; what is being answered is "is the person holding this token
   * the person who owns the account", and anything more than yes/no would be a
   * second way to obtain credentials from an endpoint that has no business
   * minting them.
   *
   * The grant DOES create a session server-side as a side effect — that is
   * unavoidable with a password grant — **and this revokes it immediately.**
   *
   * This paragraph used to say the session "expires unused" in an hour. That
   * was true of the access token and wrong about the grant: a password grant
   * also returns a REFRESH token, which outlives the access token considerably
   * and can be exchanged for fresh access tokens the whole time. Every check —
   * passing or failing — was minting a durable credential nobody held and
   * nobody could revoke, on the one operation that exists to be harder to abuse
   * than a bearer token.
   *
   * The revoke is best-effort and scoped to the session it created, never
   * global: a global logout would sign the owner out of their own phone as a
   * side effect of proving their password.
   *
   * ── IT TAKES A USER ID, NOT AN EMAIL, AND THAT IS THE SAFETY ──────────────
   *
   * An email parameter would make this a password-guessing oracle against any
   * account: pass somebody else's address with a guess and the boolean tells
   * you whether you were right. Every caller would then have to remember to
   * source it from the verified token — and one day one would not.
   *
   * Taking the id makes that impossible rather than merely discouraged: the
   * address is resolved here, from GoTrue's admin API, for the id the caller's
   * own token carries. There is no parameter to get wrong.
   *
   * **The id must come from a verified token.** `jwt.ts` trusts nothing but
   * `sub`, deliberately — so the email is looked up rather than read from an
   * `email` claim, which is untrusted and can be stale after an address change.
   *
   * Returns false for a user that does not exist, which is the same answer a
   * wrong password gets. There is nothing to distinguish for a caller who is
   * authenticated as that user.
   */
  verifyPassword(input: {
    readonly userId: string;
    readonly password: string;
  }): Promise<boolean>;
}

export interface GoTrueClientOptions {
  /** Project origin, e.g. `http://127.0.0.1:54321`. `/auth/v1` is appended. */
  readonly baseUrl: string;
  readonly serviceRoleKey: string;
  readonly anonKey: string;
  readonly timeoutMs?: number;

  /**
   * Where a failed session revoke is reported. Optional, and structural so
   * `FastifyBaseLogger` satisfies it without this module knowing about Fastify.
   *
   * Optional because the revoke is best-effort: a client built without one
   * still revokes, it just does so silently. Every production construction
   * passes one.
   */
  readonly log?: { warn(context: object, message: string): void };
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

/** The access token from a grant response, or `undefined` if it is not there. */
function readAccessToken(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const token = (body as { access_token?: unknown }).access_token;
  return typeof token === 'string' && token !== '' ? token : undefined;
}

export function createGoTrueClient(options: GoTrueClientOptions): GoTrueClient {
  const authBase = `${options.baseUrl.replace(/\/+$/, '')}/auth/v1`;
  const timeoutMs = options.timeoutMs ?? GOTRUE_TIMEOUT_MS;

  async function call(
    path: string,
    init: {
      method: string;
      key: string;
      body?: unknown;
      /**
       * A bearer distinct from the apikey.
       *
       * Every other call here authenticates AS a key — the anon key or the
       * service-role key — so the two headers carry the same value. `/logout`
       * is the exception: GoTrue identifies the SESSION to end from the bearer,
       * and the apikey only admits the request. Passing the key as both would
       * ask GoTrue to end the anon key's session, which is not a thing.
       */
      bearer?: string;
    },
  ): Promise<{ status: number; body: unknown }> {
    // Built up rather than declared inline: `exactOptionalPropertyTypes` means
    // `body: undefined` is not the same as no `body` at all, and a DELETE with
    // an explicit undefined body does not type-check.
    const request: RequestInit = {
      method: init.method,
      headers: {
        apikey: init.key,
        authorization: `Bearer ${init.bearer ?? init.key}`,
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

  /**
   * Ends the session a password grant just created. Never throws.
   *
   * ── BEST-EFFORT, AND THE ASYMMETRY IS THE POINT ────────────────────────────
   *
   * Its one caller has already decided the password was correct. A failed
   * revoke leaves a token alive for its natural lifetime — bad, and logged —
   * whereas throwing would fail an account deletion over housekeeping, which is
   * refusing somebody their own erasure for a reason that has nothing to do
   * with them.
   *
   * A missing token is not an error either: `readAccessToken` returns undefined
   * only if GoTrue answered 200 with no `access_token`, which the contract says
   * cannot happen. There would be nothing to revoke in that case anyway.
   */
  async function revokeSession(accessToken: string | undefined): Promise<void> {
    if (accessToken === undefined) return;

    try {
      // `scope: global` ends every session for the user, not merely this one.
      // NOT used: this must revoke only what it created. A global logout would
      // sign the owner out of their phone as a side effect of proving their
      // password — on the screen where they are about to be told the deletion
      // failed, if it does.
      const { status } = await call('/logout?scope=local', {
        method: 'POST',
        key: options.anonKey,
        bearer: accessToken,
      });

      // 204 is the success. 401 means the token is already invalid, which is
      // the state this call exists to reach.
      if (status === 204 || status === 200 || status === 401) return;

      options.log?.warn(
        { event: 'gotrue.revoke_failed', status },
        'reauthentication session not revoked; it will expire on its own',
      );
    } catch (error) {
      options.log?.warn(
        {
          event: 'gotrue.revoke_failed',
          detail: error instanceof Error ? error.message : 'unknown error',
        },
        'reauthentication session not revoked; it will expire on its own',
      );
    }
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

    async verifyPassword({ userId, password }): Promise<boolean> {
      // The address, from the admin API rather than from a claim. See the
      // interface comment: `jwt.ts` trusts nothing but `sub`, and an `email`
      // claim can be stale after an address change.
      const lookup = await call(`/admin/users/${encodeURIComponent(userId)}`, {
        method: 'GET',
        key: options.serviceRoleKey,
      });

      if (lookup.status === 404) return false;
      if (lookup.status !== 200) {
        const code = providerCodeOf(lookup.body);
        throw new GoTrueError(
          classify(lookup.status, code),
          `auth provider could not read the user (HTTP ${String(lookup.status)})`,
          code,
        );
      }

      const email = (lookup.body as { email?: unknown } | null)?.email;
      if (typeof email !== 'string' || email === '') {
        // An account with no address cannot have a password grant run against
        // it. Refusing is right: this is a re-authentication check, and one
        // that cannot be performed has not passed.
        return false;
      }

      // ── THE ANON KEY, NOT THE SERVICE-ROLE KEY ───────────────────────────
      //
      // This is the ordinary password grant every client uses, and it must be
      // made as one. The service-role key bypasses RLS and, more to the point
      // here, is the wrong credential for an operation whose entire purpose is
      // to check somebody else's: an admin-authenticated call that "verified" a
      // password would be verifying it under an authority that does not need
      // one.
      const { status, body } = await call('/token?grant_type=password', {
        method: 'POST',
        key: options.anonKey,
        body: { email, password },
      });

      if (status === 200) {
        // ══ THE SESSION THIS JUST MINTED IS REVOKED IMMEDIATELY ══════════════
        //
        // **This used to be left alone**, with a comment saying it "expires
        // unused" in an hour. That was true of the ACCESS token and wrong about
        // the grant: a password grant also returns a REFRESH token, which
        // outlives the access token by a long way and can be exchanged for new
        // access tokens the whole time.
        //
        // So every re-authentication check — for an operation whose entire
        // purpose is to be harder to abuse than a bearer token — was minting a
        // durable credential that nobody holds, nobody uses, and nobody can
        // revoke. It never left this process, which is why it was not an
        // incident; it was still a credential in a log or a heap dump away from
        // being one.
        //
        // `/logout` ends the session the bearer identifies. Best-effort: the
        // password check has ALREADY succeeded on its own terms, and failing
        // the account deletion because a cleanup call did not land would be
        // refusing somebody their own erasure over housekeeping.
        await revokeSession(readAccessToken(body));
        return true;
      }

      // ── A WRONG PASSWORD IS `false`, AND AN OUTAGE IS A THROW ────────────
      //
      // The distinction is the whole safety of this function. GoTrue answers
      // 400 for bad credentials; anything else — 500, a gateway error, a
      // timeout — means we do not KNOW whether the password was right.
      //
      // **Returning false for those would fail closed**, which sounds correct
      // and is not: the caller turns false into "wrong password", so an outage
      // would tell an owner their own password is wrong. Throwing lets the
      // caller say "we could not check" instead, which is true.
      if (status === 400 || status === 401) return false;

      const code = providerCodeOf(body);
      throw new GoTrueError(
        classify(status, code),
        `auth provider could not verify the password (HTTP ${String(status)})`,
        code,
      );
    },
  };
}
