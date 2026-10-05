/** Google sign-in through Supabase's PKCE flow in the system browser (owner-v5 01, 02). */

export const GOOGLE_REDIRECT = "bookflow://auth/callback";

export const GOOGLE_ERROR = "Google sign-in didn't finish. Try again or use your email.";

export type GoogleResult = { kind: "code"; code: string } | { kind: "cancel" } | { kind: "error" };

type BrowserResult = { type: string; url?: string };

/**
 * What the browser handed back: a PKCE code, a cancel (closed browser or back) or an error.
 * Supabase puts `?code=` or `?error=` on the redirect; fragments are read too, to be safe.
 */
export function readGoogleResult(result: BrowserResult): GoogleResult {
  if (result.type === "cancel" || result.type === "dismiss") return { kind: "cancel" };
  if (result.type !== "success" || !result.url) return { kind: "error" };
  const [beforeHash, hash = ""] = result.url.split("#");
  const query = beforeHash?.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  for (const [key, value] of new URLSearchParams(hash))
    if (!params.has(key)) params.set(key, value);
  const code = params.get("code");
  if (params.get("error") || !code) return { kind: "error" };
  return { kind: "code", code };
}

/** Whether a link the app received is Supabase's redirect back from Google. */
export function isGoogleCallback(url: string | null | undefined): url is string {
  return !!url && url.startsWith(GOOGLE_REDIRECT);
}

/** Supabase's reason when the redirect carries an error (query or fragment), for the log. */
export function callbackErrorDescription(url: string): string | undefined {
  const [beforeHash, hash = ""] = url.split("#");
  for (const part of [beforeHash?.split("?")[1] ?? "", hash]) {
    const params = new URLSearchParams(part);
    const error = params.get("error");
    if (error) return [error, params.get("error_description")].filter(Boolean).join(": ");
  }
  return undefined;
}
