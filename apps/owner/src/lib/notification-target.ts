/** Where a tapped notification opens (owner-v5 04). */
export type NotificationTarget = {
  screen: "today" | "calendar";
  /** The booking's day in the salon's zone, YYYY-MM-DD. */
  date: string;
  bookingId?: string;
};

const KINDS = ["new_booking", "cancellation", "morning_summary"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads a push's `data` (set by the database: kind, booking_id, date). A day that is `today` in
 * the salon's zone opens Today; any other day opens the Calendar's Day view on that date.
 */
export function notificationTarget(data: unknown, today: string): NotificationTarget | null {
  if (!data || typeof data !== "object") return null;
  const { kind, booking_id: bookingId, date } = data as Record<string, unknown>;
  if (typeof kind !== "string" || !KINDS.includes(kind)) return null;
  if (typeof date !== "string" || !DATE.test(date)) return null;
  const target: NotificationTarget = { screen: date === today ? "today" : "calendar", date };
  if (typeof bookingId === "string" && bookingId) target.bookingId = bookingId;
  return target;
}
