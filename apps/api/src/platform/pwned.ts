import { createHash } from 'node:crypto';

/**
 * The leaked-password check ADR-030 requires.
 *
 * ══ WHY THIS EXISTS AT ALL ══════════════════════════════════════════════════
 *
 * ADR-030 pairs an eight-character floor with GoTrue's leaked-password
 * protection and is explicit that the breach check is the half that actually
 * stops weak passwords — a breached password fails regardless of how well it
 * satisfies a composition rule.
 *
 * **GoTrue's check cannot apply on the path ADR-037 mandates.** Measured
 * 2026-08-14 against the local stack and against `bookflow-staging`:
 * service-role `POST /admin/users` returns 200 for `password123`, and for a
 * seven-character password. The admin API enforces no password policy at all,
 * and ADR-037 requires the admin API because open sign-up is disabled.
 *
 * So the check is performed here, before the account is created. This is the
 * one piece of security-critical code the project writes rather than delegates,
 * and it is written this way precisely because it is small: a hash, a prefix,
 * and a string comparison.
 *
 * ══ THE PASSWORD NEVER LEAVES THIS PROCESS ══════════════════════════════════
 *
 * k-anonymity, which is what the range API is for. We send the FIRST FIVE hex
 * characters of the SHA-1 — a bucket shared by roughly 800 passwords — and
 * receive every suffix in that bucket. The comparison happens here. The remote
 * side learns a bucket, never a password and never a full hash.
 *
 * SHA-1 is not a security choice and is not doing security work: it is the
 * corpus's index. The password is not stored anywhere and this hash is computed
 * and discarded inside one function call.
 *
 * No API key. The range endpoint is unauthenticated by design.
 */

/** The real service. Overridable so tests can serve the same wire format. */
const HIBP_BASE_URL = 'https://api.pwnedpasswords.com';

/**
 * Short, and deliberately shorter than the GoTrue timeout.
 *
 * This call sits in front of a user pressing "create account". Two seconds is
 * long enough for a healthy round trip and short enough that a hanging third
 * party is not felt as a broken sign-up — which matters because the answer when
 * it times out is to continue anyway.
 */
const BREACH_CHECK_TIMEOUT_MS = 2_000;

export type BreachVerdict =
  | 'breached'
  | 'not-breached'
  /** The corpus could not be consulted. The caller decides; see `signUp`. */
  | 'unavailable';

export interface BreachChecker {
  check(password: string): Promise<BreachVerdict>;
}

export interface BreachCheckerOptions {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

/**
 * Parses a range response.
 *
 * ── THE PADDING RULE, WHICH IS EASY TO GET WRONG ────────────────────────────
 *
 * With `Add-Padding`, the service mixes in fabricated suffixes so that the
 * response SIZE does not reveal how populated the bucket is. **Padded entries
 * carry a count of zero**, and a parser that treats "the suffix is present" as
 * "the password is breached" would reject perfectly good passwords at random —
 * a failure that would look like nothing at all until a user complained.
 *
 * Observed on the live service 2026-08-14: 63 of the entries returned for
 * prefix `CBFDA` had count `0`. So the count is read, and a zero is a miss.
 */
export function isSuffixBreached(body: string, suffix: string): boolean {
  for (const rawLine of body.split('\n')) {
    // The service separates with CRLF.
    const line = rawLine.trim();
    if (line === '') continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const candidate = line.slice(0, separator);
    if (candidate.toUpperCase() !== suffix) continue;

    const count = Number.parseInt(line.slice(separator + 1), 10);
    return Number.isFinite(count) && count > 0;
  }
  return false;
}

export function createBreachChecker(
  options: BreachCheckerOptions = {},
): BreachChecker {
  const baseUrl = (options.baseUrl ?? HIBP_BASE_URL).replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? BREACH_CHECK_TIMEOUT_MS;

  return {
    async check(password: string): Promise<BreachVerdict> {
      const digest = createHash('sha1')
        .update(password, 'utf8')
        .digest('hex')
        .toUpperCase();
      const prefix = digest.slice(0, 5);
      const suffix = digest.slice(5);

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/range/${prefix}`, {
          headers: {
            // Constant-size responses, so an observer cannot infer the bucket
            // from the length. Costs nothing and is the documented option.
            'Add-Padding': 'true',
            accept: 'text/plain',
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        // Network failure, DNS failure or the timeout. Nothing about the error
        // is propagated: it cannot say anything useful about the password, and
        // the caller's decision is the same either way.
        return 'unavailable';
      }

      if (!response.ok) return 'unavailable';

      let body: string;
      try {
        body = await response.text();
      } catch {
        return 'unavailable';
      }

      return isSuffixBreached(body, suffix) ? 'breached' : 'not-breached';
    },
  };
}
