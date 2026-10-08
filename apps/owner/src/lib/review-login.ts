import { AUTH_MESSAGES } from "./auth-errors";

/**
 * Google Play's reviewers sign in with this email and a password (release 1.0.1). Every other
 * email keeps the 6-digit code.
 */
export const REVIEW_EMAIL = "support@mugu-labs.com";

export const REVIEW_MESSAGES = {
  wrongPassword: "That password isn't right. Try again.",
  tooMany: "Too many tries. Wait 15 minutes and try again.",
  // The server isn't set up for the review login (503).
  unavailable: "Signing in is unavailable. Try again later.",
  // A 500 or any other unexpected answer.
  unknown: AUTH_MESSAGES.unknown,
  // The server answered with a token, but exchanging it for a session failed.
  finishFailed: "Couldn't finish signing in. Try again.",
  // Only when the request itself never got an answer.
  offline: AUTH_MESSAGES.offline,
} as const;

export function isReviewEmail(email: string): boolean {
  return email.trim().toLowerCase() === REVIEW_EMAIL;
}

export function signInButtonLabel(email: string): string {
  return isReviewEmail(email) ? "Sign in" : "Send me a code";
}

export type ReviewSignInResult = { ok: true; tokenHash: string } | { ok: false; message: string };

/**
 * POST /api/review-sign-in. The server checks the password and answers with a magic-link token
 * hash, which the app then exchanges for a session with verifyOtp.
 */
export async function requestReviewSignIn(
  input: { email: string; password: string },
  baseUrl: string,
  fetchImpl: (url: string, init: RequestInit) => Promise<Response> = fetch,
): Promise<ReviewSignInResult> {
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/review-sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email.trim().toLowerCase(), password: input.password }),
    });
  } catch {
    return { ok: false, message: REVIEW_MESSAGES.offline };
  }
  if (response.status === 401) return { ok: false, message: REVIEW_MESSAGES.wrongPassword };
  if (response.status === 429) return { ok: false, message: REVIEW_MESSAGES.tooMany };
  if (response.status === 503) return { ok: false, message: REVIEW_MESSAGES.unavailable };
  if (!response.ok) return { ok: false, message: REVIEW_MESSAGES.unknown };
  const body = (await response.json().catch(() => null)) as { token_hash?: unknown } | null;
  if (typeof body?.token_hash !== "string" || !body.token_hash) {
    return { ok: false, message: REVIEW_MESSAGES.unknown };
  }
  return { ok: true, tokenHash: body.token_hash };
}

/**
 * Exchanges the server's token hash for a session. Returns the message to show, or null once
 * signed in (the root layout then moves on to Today).
 */
export async function completeReviewSignIn(
  tokenHash: string,
  verifyOtp: (params: { token_hash: string; type: "magiclink" }) => Promise<{ error: unknown }>,
): Promise<string | null> {
  try {
    const { error } = await verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    return error ? REVIEW_MESSAGES.finishFailed : null;
  } catch {
    return REVIEW_MESSAGES.finishFailed;
  }
}
