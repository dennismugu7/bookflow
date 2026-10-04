import { z } from "zod";

/** The three switches of Menu → Notifications (owner-v5 05), as get/set_notification_prefs return them. */
export const prefsSchema = z.object({
  new_bookings: z.boolean(),
  cancellations: z.boolean(),
  morning_summary: z.boolean(),
});

export type NotificationPrefs = z.infer<typeof prefsSchema>;
export type PrefKey = keyof NotificationPrefs;

export const PREF_ROWS: { key: PrefKey; title: string; detail: string }[] = [
  { key: "new_bookings", title: "New bookings", detail: "When a client books online" },
  { key: "cancellations", title: "Cancellations", detail: "When a client cancels" },
  { key: "morning_summary", title: "Morning summary", detail: "Today's bookings at 07:00" },
];

export const PREFS_LOAD_ERROR = "Couldn't load your notification settings. Go back and try again.";
export const PREFS_SAVE_ERROR = "Couldn't save that change. Check your connection and try again.";

/** The RPC's arguments for these switches. */
export const prefsArgs = (prefs: NotificationPrefs) => ({
  p_new_bookings: prefs.new_bookings,
  p_cancellations: prefs.cancellations,
  p_morning_summary: prefs.morning_summary,
});

/** What the phone's permission lets the settings screen offer. */
export type PhonePermission = "granted" | "can-ask" | "blocked";

export function phonePermission(status: {
  granted: boolean;
  canAskAgain: boolean;
}): PhonePermission {
  if (status.granted) return "granted";
  return status.canAskAgain ? "can-ask" : "blocked";
}

/**
 * Whether to show "Turn on notifications" (owner-v5 03) on reaching the tabs: once ever per phone,
 * and only while Android's permission isn't granted.
 */
export const shouldShowIntro = (alreadyShown: boolean, permission: PhonePermission) =>
  !alreadyShown && permission !== "granted";
