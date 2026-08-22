/**
 * Transactional email, as a client.
 *
 * ══ WHAT THIS IS AND IS NOT ═════════════════════════════════════════════════
 *
 * ADR-027 splits email by which system owns the record it reports on. GoTrue
 * owns the `auth.users` row, so activation, password reset, email change and
 * magic links are ITS mail and are sent by it — `gotrue.ts` never composes a
 * message body. **This file is the other half**: mail about a record OUR API
 * owns, which today is a booking changing status.
 *
 * ── AND IT IS NOT THE OUTBOX ───────────────────────────────────────────────
 *
 * ADR-012 requires email about our own records to be written to a
 * transactional outbox inside the same transaction as the state change, with
 * the provider called by a worker rather than inside a request. **That worker
 * does not exist** (ADR-027 deferred it: "no domain record exists to notify
 * anyone about until the booking slice"), and the booking slice is now here.
 *
 * So this sends in-process, AFTER the status transaction has committed, and
 * best-effort: a failure logs a warning and does not fail the request or roll
 * the status back. That satisfies `DEFINITION_OF_DONE.md`'s rule about
 * dispatch-after-commit and does NOT satisfy ADR-012's outbox — the difference
 * being that a send lost to a crash between commit and dispatch is lost for
 * good, where an outbox row would be retried.
 *
 * **That is a real gap and it is the outbox's to close.** It is recorded here
 * rather than in a comment nobody reads because the alternative — building the
 * outbox and its worker inside this slice — is a second feature.
 *
 * ── CREDENTIALS ─────────────────────────────────────────────────────────────
 *
 * The API key never leaves this process, is never logged, never appears in a
 * thrown message, and is not echoed into an error even when Resend returns one
 * containing it. Resend's own error body is read for a `message` and nothing
 * else is propagated.
 */

/** Bounded, because `fetch` has no default timeout — same reasoning as jwt.ts. */
const RESEND_TIMEOUT_MS = 10_000;

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type MailFailure = 'rejected' | 'rate-limited' | 'unavailable';

export class MailError extends Error {
  readonly failure: MailFailure;
  /** The provider's own message, for the log. Never sent to a client. */
  readonly providerMessage: string | undefined;

  constructor(failure: MailFailure, message: string, providerMessage?: string) {
    super(message);
    this.name = 'MailError';
    this.failure = failure;
    this.providerMessage = providerMessage;
  }
}

export interface Mail {
  readonly to: string;
  readonly subject: string;
  /** Plain text. No HTML: see `bookings.email.ts` for why. */
  readonly text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export interface MailerOptions {
  readonly apiKey: string;
  /** The `From:` header, e.g. `Bookflow <bookings@example.com>`. */
  readonly from: string;
  readonly timeoutMs?: number;
}

function providerMessageOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const candidate = body as { message?: unknown; error?: unknown };
  for (const value of [candidate.message, candidate.error]) {
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

export function createMailer(options: MailerOptions): Mailer {
  const timeoutMs = options.timeoutMs ?? RESEND_TIMEOUT_MS;

  return {
    async send(mail): Promise<void> {
      let response: Response;
      try {
        response = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            from: options.from,
            to: [mail.to],
            subject: mail.subject,
            text: mail.text,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        // The endpoint is safe to name — it is a public URL, not a credential.
        throw new MailError(
          'unavailable',
          `mail provider unreachable at ${RESEND_ENDPOINT}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }

      if (response.status >= 200 && response.status < 300) return;

      let body: unknown = null;
      try {
        const text = await response.text();
        body = text === '' ? null : JSON.parse(text);
      } catch {
        body = null;
      }

      const providerMessage = providerMessageOf(body);
      const failure: MailFailure =
        response.status === 429
          ? 'rate-limited'
          : response.status >= 500
            ? 'unavailable'
            : 'rejected';

      throw new MailError(
        failure,
        `mail provider refused the send (HTTP ${String(response.status)})`,
        providerMessage,
      );
    },
  };
}

/**
 * A mailer that does nothing, for an environment with no key.
 *
 * ── WHY THIS EXISTS RATHER THAN A CONFIG BRANCH AT EVERY CALL SITE ─────────
 *
 * Local development and the integration suite have no Resend key and must not
 * need one; `config.ts` requires the key only in production. Without this,
 * every send site would carry `if (mailer !== undefined)` and one of them would
 * eventually forget.
 *
 * **It logs rather than being silent.** A no-op mailer that said nothing would
 * make "the mail is not arriving" indistinguishable from "the mail is not being
 * sent", which is the debugging session this saves.
 */
export function createNoopMailer(log: {
  info(payload: Record<string, unknown>, message: string): void;
}): Mailer {
  return {
    async send(mail): Promise<void> {
      // The recipient and subject only. Never the body: it carries a client's
      // name and appointment.
      log.info(
        { event: 'mail.not_configured', to: mail.to, subject: mail.subject },
        'mail not sent: no provider configured',
      );
      return Promise.resolve();
    },
  };
}
