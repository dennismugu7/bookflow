import { describe, expect, it } from "vitest";

import {
  actionsFor,
  amount,
  badgesFor,
  barTone,
  firstName,
  nextBookingId,
  nextBookingSummary,
  nextFreeSlot,
  ordinal,
  parseAgenda,
  serviceLine,
  timeline,
  visitLine,
  whatsappLink,
  type AgendaBooking,
} from "./agenda";

const CLIENT = {
  id: "c1",
  full_name: "Wanjiru Otieno",
  phone: "+254700000051",
  phone_verified: true,
  visit_number: 3,
};

function booking(over: Partial<AgendaBooking> = {}): AgendaBooking {
  return {
    id: "b1",
    status: "confirmed",
    starts_at: "2026-10-03T07:30:00Z",
    ends_at: "2026-10-03T08:00:00Z",
    source: "web",
    is_new: false,
    staff_id: "s1",
    staff_name: "Njeri",
    total_kes: 1500,
    client: CLIENT,
    services: [{ name: "Silk press", duration_min: 30, price_kes: 1500 }],
    ...over,
  };
}

const agenda = parseAgenda({
  date: "2026-10-03",
  stats: { booked: 2, expected_kes: 3000, free_min: 120 },
  bookings: [
    booking({
      id: "a",
      status: "completed",
      starts_at: "2026-10-03T06:00:00Z",
      ends_at: "2026-10-03T06:45:00Z",
    }),
    booking({ id: "b" }),
    booking({ id: "c", starts_at: "2026-10-03T11:00:00Z", ends_at: "2026-10-03T12:00:00Z" }),
  ],
  gaps: [{ starts_at: "2026-10-03T09:00:00Z", ends_at: "2026-10-03T11:00:00Z", minutes: 120 }],
});

describe("Today list", () => {
  it("puts gaps in their places among the bookings", () => {
    expect(timeline(agenda).map((r) => (r.kind === "gap" ? "gap" : r.booking.id))).toEqual([
      "a",
      "b",
      "gap",
      "c",
    ]);
  });

  it("marks the first confirmed booking that hasn't ended as Next", () => {
    expect(nextBookingId(agenda.bookings, new Date("2026-10-03T07:40:00Z"))).toBe("b");
    expect(nextBookingId(agenda.bookings, new Date("2026-10-03T08:00:00Z"))).toBe("c");
    expect(nextBookingId(agenda.bookings, new Date("2026-10-03T13:00:00Z"))).toBeUndefined();
  });

  it("gives each card its badges and bar", () => {
    const b = booking({ is_new: true, client: { ...CLIENT, phone_verified: false } });
    expect(badgesFor(b, "b1")).toEqual(["next", "new", "unverified"]);
    expect(badgesFor(booking({ status: "completed" }), undefined)).toEqual(["done"]);
    expect(badgesFor(booking({ status: "no_show" }), undefined)).toEqual(["noShow"]);
    expect(barTone(booking({ status: "completed" }), undefined)).toBe("done");
    expect(barTone(b, "b1")).toBe("next");
    expect(barTone(b, "x")).toBe("idle");
  });

  it("doesn't call a walk-in without a phone unverified", () => {
    const walkIn = booking({
      source: "owner",
      client: { id: "c", full_name: "Mary", phone: null, phone_verified: false, visit_number: 1 },
    });
    expect(badgesFor(walkIn, undefined)).toEqual([]);
  });
});

describe("opened card", () => {
  const owner = { isOwner: true, staffId: null };
  const before = new Date("2026-10-03T07:00:00Z");
  const after = new Date("2026-10-03T07:30:00Z");

  it("offers Mark done and No-show only once the booking has started", () => {
    expect(actionsFor(booking(), before, owner)).toEqual({
      markDone: false,
      noShow: false,
      cancel: true,
    });
    expect(actionsFor(booking(), after, owner)).toEqual({
      markDone: true,
      noShow: true,
      cancel: true,
    });
  });

  it("offers nothing on a finished booking", () => {
    expect(actionsFor(booking({ status: "completed" }), after, owner)).toEqual({
      markDone: false,
      noShow: false,
      cancel: false,
    });
  });

  it("lets staff mark only their own bookings, and never cancel", () => {
    expect(actionsFor(booking(), after, { isOwner: false, staffId: "s1" })).toEqual({
      markDone: true,
      noShow: true,
      cancel: false,
    });
    expect(actionsFor(booking(), after, { isOwner: false, staffId: "s2" }).markDone).toBe(false);
  });

  it("writes the visit line, services, amounts and links", () => {
    expect(visitLine(booking())).toBe("3rd visit · booked online");
    expect(visitLine(booking({ source: "owner", client: { ...CLIENT, visit_number: 1 } }))).toBe(
      "1st visit · added by you",
    );
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "101st",
    ]);
    const twoServices = booking({
      services: [
        { name: "Wash & set", duration_min: 45, price_kes: 1200 },
        { name: "Trim", duration_min: 30, price_kes: 1000 },
      ],
    });
    expect(serviceLine(twoServices)).toBe("Wash & set, trim · with Njeri");
    expect(amount(3500)).toBe("3,500");
    expect(amount(800)).toBe("800");
    expect(firstName("  Wanjiru Otieno ")).toBe("Wanjiru");
    expect(whatsappLink("+254712345678")).toBe("https://wa.me/254712345678");
  });
});

describe("nextFreeSlot", () => {
  const gaps = [
    { starts_at: "2026-10-03T07:00:00Z", ends_at: "2026-10-03T07:20:00Z", minutes: 20 },
    { starts_at: "2026-10-03T09:00:00Z", ends_at: "2026-10-03T11:00:00Z", minutes: 120 },
  ];
  const iso = (gapList: typeof gaps, now: string) =>
    nextFreeSlot(gapList, new Date(now)).toISOString();

  it("picks the first quarter hour in a free gap", () => {
    expect(iso(gaps, "2026-10-03T06:50:00Z")).toBe("2026-10-03T07:00:00.000Z");
    // 07:15 leaves only 5 minutes in the first gap.
    expect(iso(gaps, "2026-10-03T07:05:00Z")).toBe("2026-10-03T09:00:00.000Z");
    expect(iso(gaps, "2026-10-03T09:01:00Z")).toBe("2026-10-03T09:15:00.000Z");
  });

  it("falls back to the next quarter hour when the day is full", () => {
    expect(iso([], "2026-10-03T12:01:00Z")).toBe("2026-10-03T12:15:00.000Z");
  });
});

describe("next booking on an empty Today", () => {
  it("parses next, and accepts servers without it", () => {
    const base = { date: "2026-10-06", stats: { booked: 0, expected_kes: 0, free_min: 0 }, gaps: [] };
    expect(parseAgenda({ ...base, bookings: [], next: booking() }).next?.id).toBe("b1");
    expect(parseAgenda({ ...base, bookings: [], next: null }).next).toBeNull();
    expect(parseAgenda({ ...base, bookings: [] }).next).toBeUndefined();
  });

  it("says when, what and who, in the salon's zone", () => {
    const next = booking({ starts_at: "2026-10-12T06:30:00Z" });
    expect(nextBookingSummary(next, "Africa/Nairobi")).toEqual({
      date: "2026-10-12",
      when: "Mon 12 Oct · 09:30",
      what: "Silk press · Wanjiru Otieno",
    });
    expect(nextBookingSummary(booking({ client: null }), "Africa/Nairobi").what).toBe(
      "Silk press · Walk-in",
    );
  });
});
