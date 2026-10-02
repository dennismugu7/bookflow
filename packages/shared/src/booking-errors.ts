/**
 * SQLSTATE codes raised by the booking functions in Postgres (see supabase/migrations),
 * mapped to stable names the apps can switch on.
 */
export const BOOKING_ERROR_CODES = {
  BF400: "invalid_input",
  BF401: "phone_required",
  BF403: "business_rule",
  BF404: "not_found",
  BF409: "slot_unavailable",
  BF410: "hold_expired",
  BF422: "invalid_status_change",
  BF429: "rate_limited",
  "42501": "not_allowed",
} as const;

export type BookingErrorCode = keyof typeof BOOKING_ERROR_CODES;
export type BookingErrorKind = (typeof BOOKING_ERROR_CODES)[BookingErrorCode];

export function isBookingErrorCode(code: unknown): code is BookingErrorCode {
  return typeof code === "string" && Object.hasOwn(BOOKING_ERROR_CODES, code);
}

/** Accepts a SQLSTATE string or an error object with a `code` (as returned by supabase-js). */
export function bookingErrorKind(
  error: string | { code?: string | null; message?: string } | null | undefined,
): BookingErrorKind | null {
  const code = typeof error === "string" ? error : error?.code;
  return isBookingErrorCode(code) ? BOOKING_ERROR_CODES[code] : null;
}
