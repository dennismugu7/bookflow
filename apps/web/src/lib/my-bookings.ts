/** My bookings (/me): the shape `get_my_bookings` returns, and how the page sorts it. */

import { formatShortDateTime } from "./format";
import { salonDate } from "./time";

export type MyBookingItem = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  total_kes: number;
  staff_name: string;
  salon: {
    name: string;
    slug: string;
    address: string | null;
    maps_url: string | null;
    timezone: string;
    phone: string | null;
  };
  services: { service_id: string; name: string; duration_min: number; price_kes: number }[];
};

/** Mirrors `client_cancel_cutoff` in `private.booking_settings()`; the database decides. */
export const CLIENT_CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;

/**
 * Upcoming: confirmed and still ahead, soonest first. Past: everything else (completed, no-show,
 * cancelled and confirmed bookings whose time has passed), newest first.
 */
export function splitBookings(
  bookings: MyBookingItem[],
  now: Date,
): { upcoming: MyBookingItem[]; past: MyBookingItem[] } {
  const start = (b: MyBookingItem) => new Date(b.starts_at).getTime();
  const isUpcoming = (b: MyBookingItem) => b.status === "confirmed" && start(b) > now.getTime();
  return {
    upcoming: bookings.filter(isUpcoming).sort((a, b) => start(a) - start(b)),
    past: bookings.filter((b) => !isUpcoming(b)).sort((a, b) => start(b) - start(a)),
  };
}

/** Whether the client may still cancel online (more than 2 hours before the start). */
export function canCancelOnline(startsAt: string, now: Date): boolean {
  return new Date(startsAt).getTime() > now.getTime() + CLIENT_CANCEL_CUTOFF_MS;
}

/** "Today, 10:30" or "Mon 5 Oct, 10:30", in the salon's timezone. */
export function bookingWhen(startsAt: string, timeZone: string, now: Date): string {
  const full = formatShortDateTime(startsAt, timeZone);
  if (salonDate(new Date(startsAt), timeZone) !== salonDate(now, timeZone)) return full;
  return `Today, ${full.split(", ")[1]}`;
}

/** The salon's booking flow with the same services preselected; the page drops any not bookable. */
export function bookAgainHref(booking: MyBookingItem): string {
  const ids = booking.services.map((s) => s.service_id).filter(Boolean);
  return `/s/${booking.salon.slug}/book?${new URLSearchParams({ services: ids.join(",") })}`;
}
