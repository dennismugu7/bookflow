// Moving a booking to a new time (QA report 8663, S-01; docs/specs/qa-8663-reschedule.md).

import { bookingErrorKind } from "@bookflow/shared";

import type { AgendaBooking } from "./agenda";

/** Owners move confirmed bookings; staff and finished bookings don't (reschedule_booking). */
export function canReschedule(
  booking: Pick<AgendaBooking, "status">,
  viewer: { isOwner: boolean },
): boolean {
  return viewer.isOwner && booking.status === "confirmed";
}

/** A friendly message for a reschedule_booking error. */
export function rescheduleErrorMessage(
  error: { code?: string | null; message?: string } | null | undefined,
): string {
  switch (bookingErrorKind(error)) {
    case "slot_unavailable":
      return "That time is taken. Pick another.";
    case "invalid_input":
      return "Pick a time in the future.";
    case "invalid_status_change":
      return "This booking has already changed. Pull down to refresh.";
    case "not_found":
      return "This booking is no longer here. Pull down to refresh.";
    case "not_allowed":
      return "Only the salon owner can move a booking.";
    default:
      return "Couldn't move the booking. Check your connection and try again.";
  }
}
