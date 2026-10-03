import { bookingErrorKind } from "@bookflow/shared";

/** HTTP status and a client-safe message for a failed hold. Database messages are never passed on. */
export function holdErrorResponse(error: { code?: string | null } | null | undefined): {
  status: number;
  code: string;
  message: string;
} {
  switch (bookingErrorKind(error)) {
    case "slot_unavailable":
      return {
        status: 409,
        code: "SLOT_TAKEN",
        message: "That time was just taken. Pick another.",
      };
    case "rate_limited":
      return {
        status: 429,
        code: "RATE_LIMITED",
        message: "Too many tries. Wait a while and try again.",
      };
    case "not_found":
    case "invalid_input":
      return {
        status: 400,
        code: "INVALID",
        message: "Something about this booking changed. Start again.",
      };
    default:
      return { status: 500, code: "UNKNOWN", message: "Something went wrong. Try again." };
  }
}

export type ConfirmOutcome =
  | { kind: "expired"; message: string }
  | { kind: "invalid"; message: string }
  | { kind: "signin"; message: string }
  | { kind: "unknown"; message: string };

/** What the confirm step should do after `confirm_booking_contact` fails. */
export function confirmErrorOutcome(
  error: { code?: string | null } | null | undefined,
): ConfirmOutcome {
  switch (bookingErrorKind(error)) {
    case "hold_expired":
    case "not_found":
      return { kind: "expired", message: "Your hold expired. Pick another time." };
    case "invalid_input":
      return { kind: "invalid", message: "Check your name and phone number." };
    case "phone_required":
    case "not_allowed":
      return { kind: "signin", message: "Please sign in again to confirm." };
    default:
      return { kind: "unknown", message: "Couldn't confirm. Check your connection and try again." };
  }
}
