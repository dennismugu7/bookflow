"use server";

import { bookingErrorKind } from "@bookflow/shared";

import { createClient } from "../../lib/supabase/server";

export type CancelResult =
  { ok: true } | { ok: false; reason: "too_late" | "signin" | "failed"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cancels the signed-in client's booking. The database checks ownership, status and the cutoff. */
export async function cancelMyBooking(bookingId: string, reason: string): Promise<CancelResult> {
  if (!UUID.test(bookingId))
    return { ok: false, reason: "failed", message: "Couldn't find this booking." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { ok: false, reason: "signin", message: "Please sign in again." };

  const trimmed = reason.trim().slice(0, 200);
  const { error } = await supabase.rpc("cancel_my_booking", {
    p_booking_id: bookingId,
    p_reason: trimmed || undefined,
  });
  if (!error) return { ok: true };

  if (bookingErrorKind(error) === "invalid_status_change" && /too late/i.test(error.message))
    return { ok: false, reason: "too_late", message: "It's too late to cancel online." };
  if (bookingErrorKind(error) === "not_allowed")
    return { ok: false, reason: "signin", message: "Please sign in again." };
  return {
    ok: false,
    reason: "failed",
    message: "Couldn't cancel this booking. Refresh and try again.",
  };
}
