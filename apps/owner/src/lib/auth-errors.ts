/** The fields of a Supabase AuthError (or any thrown value) that decide which message to show. */
type ErrorLike =
  { code?: string; status?: number; message?: string; name?: string } | null | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}

export const AUTH_MESSAGES = {
  invalidEmail: "Enter a valid email address.",
  rateLimited: "Wait a minute before asking for another code.",
  badCode: "That code is wrong or has expired. Check the latest email or ask for a new code.",
  incompleteCode: "Enter all 6 digits.",
  offline: "No connection. Check your internet and try again.",
  unknown: "Something went wrong. Try again.",
} as const;

function isNetworkError(error: NonNullable<ErrorLike>): boolean {
  return (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    /network request failed|failed to fetch/i.test(error.message ?? "")
  );
}

/** Message for a failed `signInWithOtp` (asking for a code). */
export function sendCodeErrorMessage(error: ErrorLike): string {
  if (!error) return AUTH_MESSAGES.unknown;
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  ) {
    return AUTH_MESSAGES.rateLimited;
  }
  if (error.code === "email_address_invalid" || error.code === "validation_failed") {
    return AUTH_MESSAGES.invalidEmail;
  }
  if (isNetworkError(error)) return AUTH_MESSAGES.offline;
  return AUTH_MESSAGES.unknown;
}

/** Message for a failed `verifyOtp` (entering the code). */
export function verifyCodeErrorMessage(error: ErrorLike): string {
  if (!error) return AUTH_MESSAGES.unknown;
  if (error.status === 429 || error.code === "over_request_rate_limit")
    return AUTH_MESSAGES.rateLimited;
  if (error.code === "otp_expired" || error.code === "otp_disabled" || error.status === 403) {
    return AUTH_MESSAGES.badCode;
  }
  if (isNetworkError(error)) return AUTH_MESSAGES.offline;
  return AUTH_MESSAGES.unknown;
}

/** Keeps only digits, up to 6, so a pasted "123 456" or "Code: 123456" still works. */
export function sanitizeCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}

/** Seconds left before "Resend code" is allowed again. */
export function resendSecondsLeft(sentAt: number, now: number, cooldownSeconds = 60): number {
  return Math.max(0, Math.ceil((sentAt + cooldownSeconds * 1000 - now) / 1000));
}
