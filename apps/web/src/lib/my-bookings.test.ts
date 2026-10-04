import { describe, expect, it } from "vitest";

import {
  bookAgainHref,
  bookingWhen,
  canCancelOnline,
  splitBookings,
  type MyBookingItem,
} from "./my-bookings";

const NOW = new Date("2026-10-04T07:00:00Z"); // Sun 4 Oct, 10:00 in Nairobi

function booking(id: string, status: string, startsAt: string): MyBookingItem {
  return {
    id,
    status,
    starts_at: startsAt,
    ends_at: startsAt,
    total_kes: 1000,
    staff_name: "Njeri Kamau",
    salon: {
      name: "Salon",
      slug: "salon",
      address: null,
      maps_url: null,
      timezone: "Africa/Nairobi",
      phone: null,
    },
    services: [{ service_id: "s1", name: "Trim", duration_min: 30, price_kes: 1000 }],
  };
}

describe("splitBookings", () => {
  // The server sends newest first.
  const list = [
    booking("future-late", "confirmed", "2026-10-20T07:00:00Z"),
    booking("future-cancelled", "cancelled", "2026-10-10T07:00:00Z"),
    booking("future-soon", "confirmed", "2026-10-05T07:00:00Z"),
    booking("past-confirmed", "confirmed", "2026-10-03T07:00:00Z"),
    booking("completed", "completed", "2026-09-12T11:00:00Z"),
    booking("no-show", "no_show", "2026-09-01T11:00:00Z"),
  ];

  it("puts future confirmed bookings in Upcoming, soonest first", () => {
    expect(splitBookings(list, NOW).upcoming.map((b) => b.id)).toEqual([
      "future-soon",
      "future-late",
    ]);
  });

  it("puts everything else in Past, newest first", () => {
    expect(splitBookings(list, NOW).past.map((b) => b.id)).toEqual([
      "future-cancelled",
      "past-confirmed",
      "completed",
      "no-show",
    ]);
  });
});

describe("canCancelOnline", () => {
  it("allows more than 2 hours before the start", () => {
    expect(canCancelOnline("2026-10-04T09:01:00Z", NOW)).toBe(true);
  });
  it("refuses at 2 hours or less", () => {
    expect(canCancelOnline("2026-10-04T09:00:00Z", NOW)).toBe(false);
    expect(canCancelOnline("2026-10-04T08:00:00Z", NOW)).toBe(false);
  });
});

describe("bookingWhen", () => {
  it("says Today for today in the salon's timezone", () => {
    expect(bookingWhen("2026-10-04T07:30:00Z", "Africa/Nairobi", NOW)).toBe("Today, 10:30");
  });
  it("shows the date otherwise", () => {
    expect(bookingWhen("2026-10-05T07:30:00Z", "Africa/Nairobi", NOW)).toBe("Mon 5 Oct, 10:30");
  });
});

describe("bookAgainHref", () => {
  it("opens the booking flow with the same services", () => {
    const b = booking("x", "completed", "2026-09-12T11:00:00Z");
    b.services.push({ service_id: "s2", name: "Wash", duration_min: 30, price_kes: 500 });
    expect(bookAgainHref(b)).toBe("/s/salon/book?services=s1%2Cs2");
  });
});
