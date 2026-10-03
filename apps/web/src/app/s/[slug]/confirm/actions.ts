"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { confirmErrorOutcome } from "../../../../lib/booking-messages";
import { HOLD_COOKIE } from "../../../../lib/holds";
import { phoneFromField } from "../../../../lib/phone-field";
import { createClient } from "../../../../lib/supabase/server";

export type ConfirmState = {
  fieldErrors?: { fullName?: string; phone?: string };
  message?: string;
  /** "expired": back to time picking; "signin": sign in again. */
  next?: "expired" | "signin";
};

/** Confirms the held time for the signed-in client, then opens the booking page. */
export async function confirmBooking(
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phoneInput = String(formData.get("phone") ?? "");

  const fieldErrors: ConfirmState["fieldErrors"] = {};
  if (fullName.length < 1 || fullName.length > 80)
    fieldErrors.fullName = "Enter your name (up to 80 characters).";
  const phone = phoneFromField(phoneInput);
  if (!phone) fieldErrors.phone = "Enter a phone number like 0712 345 678.";
  if (fieldErrors.fullName || fieldErrors.phone) return { fieldErrors };

  const cookieStore = await cookies();
  const token = cookieStore.get(HOLD_COOKIE)?.value;
  if (!token) return { next: "expired", message: "Your hold expired. Pick another time." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { next: "signin", message: "Please sign in again to confirm." };

  const { data: bookingId, error } = await supabase.rpc("confirm_booking_contact", {
    p_hold_token: token,
    p_full_name: fullName,
    p_phone: phone!,
  });
  if (error || !bookingId) {
    const outcome = confirmErrorOutcome(error);
    if (outcome.kind === "expired") cookieStore.delete(HOLD_COOKIE);
    if (outcome.kind === "invalid") return { fieldErrors: { phone: outcome.message } };
    return {
      message: outcome.message,
      next:
        outcome.kind === "expired" ? "expired" : outcome.kind === "signin" ? "signin" : undefined,
    };
  }

  cookieStore.delete(HOLD_COOKIE);
  redirect(`/b/${bookingId}`);
}
