import { z } from 'zod';

/**
 * A URL that is safe to store and later render as a link.
 *
 * ══ `z.url()` VALIDATES SYNTAX, NOT SCHEME ══════════════════════════════════
 *
 * `javascript:alert(1)` is a syntactically valid URL and `z.url()` accepts it.
 * So does `data:text/html;base64,…`, and so does `vbscript:`. Every one of them
 * is a script that runs when somebody clicks the link.
 *
 * These values are typed by a salon owner and rendered by the client web app as
 * `<a href>` — `mapsUrl` on the location section, `photoUrl` as an `<img src>`.
 *
 * ── "REACT ESCAPES IT" IS NOT THE ANSWER, AND THIS CODEBASE SAYS SO ────────
 *
 * React does refuse `javascript:` hrefs, and that is genuinely why this is not
 * exploitable today. It is also exactly the reasoning `jwt.ts` refuses: relying
 * on a downstream library's behaviour for a security property means the
 * property lives somewhere nobody here controls, is invisible in review, and
 * disappears the day the value is rendered by something else — a server-side
 * render, an email template, a second client, a `window.open`.
 *
 * **The value is stored. Whatever renders it next inherits this decision.** So
 * the check is at the boundary where the value enters, once, rather than at
 * every place it might leave.
 *
 * ── AN ALLOWLIST, NEVER A DENYLIST ─────────────────────────────────────────
 *
 * `http` and `https`, and nothing else. The same rule ADR-020 applies to the
 * public projection and for the same reason: a denylist is a list of the
 * schemes somebody thought of, and `javascript:`, `JavaScript:`, `java\tscript:`
 * and `data:` are only the ones that are famous.
 *
 * `URL` does the parsing, so the scheme is whatever the WHATWG algorithm says it
 * is rather than whatever a regular expression thought it was — which is where
 * denylists lose.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/** Whether `value` is an absolute http(s) URL. */
export function isSafeHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // Not a URL at all — relative, empty, or malformed. Refused: these fields
    // are absolute links to somewhere else, and a relative one would resolve
    // against whatever origin happened to render it.
    return false;
  }

  return ALLOWED_PROTOCOLS.has(parsed.protocol);
}

/**
 * `z.url()` plus the scheme allowlist, as one schema.
 *
 * Both callers pass their own `max`, because the two fields have different
 * limits for unrelated reasons.
 */
export function httpUrl(maxLength: number) {
  return z.string().trim().max(maxLength).refine(isSafeHttpUrl, {
    // Says what is required, never what was sent. `problem.ts` argues at
    // length that a reflected value is how an error response becomes a probe,
    // and this message reaches a client.
    message: 'must be an http or https URL',
  });
}
