import { AUTH_MESSAGES } from "./auth-errors";

/**
 * Google Play's reviewers sign in with this email and a password (release 1.0.1). Every other
 * email keeps the 6-digit code.
 */
export const REVIEW_EMAIL = "support@mugu-labs.com";

export const REVIEW_MESSAGES = {
  wrongPassword: "That password isn't right. Try again.",
  tooMany: "Too many tries. Wait 15 minutes and try again.",
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
  try {
    const response = await fetchImpl(`${baseUrl}/api/review-sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email.trim().toLowerCase(), password: input.password }),
    });
    if (response.status === 401) return { ok: false, message: REVIEW_MESSAGES.wrongPassword };
    if (response.status === 429) return { ok: false, message: REVIEW_MESSAGES.tooMany };
    if (!response.ok) return { ok: false, message: AUTH_MESSAGES.offline };
    const body = (await response.json().catch(() => null)) as { token_hash?: unknown } | null;
    if (typeof body?.token_hash !== "string" || !body.token_hash) {
      return { ok: false, message: AUTH_MESSAGES.offline };
    }
    return { ok: true, tokenHash: body.token_hash };
  } catch {
    return { ok: false, message: AUTH_MESSAGES.offline };
  }
}
