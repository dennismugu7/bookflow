/** Google sign-in (release 1.0.0 parts 2 and 4): what an outcome means to the user. */

export const GOOGLE_ERROR = "Google sign-in didn't finish. Try again or use your email.";

/** The build's SHA-1 or client ID isn't registered with Google, or there's no Google provider. */
export const GOOGLE_NOT_SET_UP = "Google sign-in isn't set up on this build yet. Use your email.";

export type GoogleOutcome = "signed-in" | "cancelled" | "not-set-up" | "error";

/**
 * What a thrown sign-in error means (codes from modules/google-credential): a quiet cancel, a build
 * Google doesn't recognise yet, or a failure. Credential Manager reports an unregistered SHA-1 or
 * client ID as "[28444] Developer console is not set up correctly".
 */
export function googleErrorOutcome(error: unknown): Exclude<GoogleOutcome, "signed-in"> {
  const code = String((error as { code?: unknown } | null)?.code ?? "");
  const message = String((error as { message?: unknown } | null)?.message ?? "");
  if (code === "CANCELLED") return "cancelled";
  if (code === "NO_PROVIDER") return "not-set-up";
  if (/28444|Developer console is not set up/i.test(message)) return "not-set-up";
  return "error";
}

/** A sign-in result, with Google's raw error code when there was one (for debug builds). */
export type GoogleResult = { outcome: GoogleOutcome; code?: string };

/**
 * The message under the Google button, or none (signed in, or a quiet cancel). Debug builds add
 * Google's raw code, e.g. "(code 10)", so a setup problem can be told apart on the phone.
 */
export function googleMessage(result: GoogleResult, showCode = false): string | undefined {
  const message =
    result.outcome === "not-set-up"
      ? GOOGLE_NOT_SET_UP
      : result.outcome === "error"
        ? GOOGLE_ERROR
        : undefined;
  return message && showCode && result.code ? `${message} (code ${result.code})` : message;
}
