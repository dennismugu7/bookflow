/** Native Google sign-in (release 1.0.0 part 2, A): what an outcome means to the user. */

export const GOOGLE_ERROR = "Google sign-in didn't finish. Try again or use your email.";

/** The build's SHA-1 isn't registered with Google yet, or the phone has no Play Services. */
export const GOOGLE_NOT_SET_UP = "Google sign-in isn't set up on this build yet. Use your email.";

export type GoogleOutcome = "signed-in" | "cancelled" | "not-set-up" | "error";

// Google Play Services' CommonStatusCodes.DEVELOPER_ERROR: the app's package and signing SHA-1
// don't match an Android OAuth client.
const DEVELOPER_ERROR = "10";

type Codes = { cancelled: string; inProgress: string; noPlayServices: string };

/** What a thrown sign-in error means: a quiet cancel, a build that isn't set up, or a failure. */
export function googleErrorOutcome(error: unknown, codes: Codes): Exclude<GoogleOutcome, "signed-in"> {
  const code = (error as { code?: unknown } | null)?.code;
  const message = String((error as { message?: unknown } | null)?.message ?? "");
  if (code === codes.cancelled || code === codes.inProgress) return "cancelled";
  if (code === codes.noPlayServices) return "not-set-up";
  if (String(code) === DEVELOPER_ERROR || message.includes("DEVELOPER_ERROR")) return "not-set-up";
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
