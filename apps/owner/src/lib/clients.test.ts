import { describe, expect, it } from "vitest";

import {
  clientBadges,
  clientFormResult,
  clientSubLine,
  clientTint,
  duplicatePhoneMessage,
  parseClientList,
  parseProfile,
  pastVisitLine,
  segmentChip,
  upcomingTitle,
  usualEvery,
  type ClientItem,
} from "./clients";

const TZ = "Africa/Nairobi";
const NOW = new Date("2026-10-03T08:00:00Z");

function client(over: Partial<ClientItem> = {}): ClientItem {
  return {
    id: "c1",
    full_name: "Grace Mutua",
    phone: "+254700000044",
    phone_verified: false,
    visits: 12,
    last_visit: "2026-08-14T07:00:00Z",
    next_booking: null,
    avg_gap_days: 21,
    segments: ["regular"],
    ...over,
  };
}

describe("the client list", () => {
  it("labels the segment chips with their counts", () => {
    const counts = { all: 42, new: 5, regular: 18, lapsed: 6 };
    expect(segmentChip("all", counts)).toBe("All · 42");
    expect(segmentChip("regular", counts)).toBe("Regulars · 18");
  });

  it("badges new and lapsed clients only", () => {
    expect(clientBadges(client({ segments: ["new", "regular"] }))).toEqual(["new"]);
    expect(clientBadges(client({ segments: ["regular", "lapsed"] }))).toEqual(["lapsed"]);
  });

  it("writes the sub-lines of 04", () => {
    expect(clientSubLine(client(), TZ, NOW)).toBe("Last visit 14 Aug · 12 visits");
    expect(
      clientSubLine(client({ next_booking: "2026-10-05T07:30:00Z", visits: 6 }), TZ, NOW),
    ).toBe("Upcoming Mon 5 Oct · 6 visits");
    expect(clientSubLine(client({ phone: null, visits: 1 }), TZ, NOW)).toBe(
      "Walk-in · 1 visit · no phone",
    );
    expect(clientSubLine(client({ phone: null, visits: 0, last_visit: null }), TZ, NOW)).toBe(
      "Walk-in · no phone",
    );
    expect(
      clientSubLine(
        client({ last_visit: "2026-06-22T07:00:00Z", avg_gap_days: 42, segments: ["lapsed"] }),
        TZ,
        NOW,
      ),
    ).toBe("Last visit 22 Jun · usually every 6 weeks");
    expect(clientSubLine(client({ visits: 0, last_visit: null }), TZ, NOW)).toBe("No visits yet");
  });

  it("adds the year to visits from another year", () => {
    expect(clientSubLine(client({ last_visit: "2025-12-20T07:00:00Z" }), TZ, NOW)).toBe(
      "Last visit 20 Dec 2025 · 12 visits",
    );
  });

  it("says the usual gap in words", () => {
    expect(usualEvery(42)).toBe("6 weeks");
    expect(usualEvery(7)).toBe("1 week");
    expect(usualEvery(10)).toBe("10 days");
    expect(usualEvery(0.4)).toBe("1 day");
  });

  it("keeps a client's colour", () => {
    expect(clientTint("abc")).toBe(clientTint("abc"));
    expect(clientTint("abc")).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe("the profile", () => {
  const booking = {
    id: "b1",
    status: "confirmed" as const,
    starts_at: "2026-10-05T07:30:00Z",
    ends_at: "2026-10-05T08:00:00Z",
    source: "web" as const,
    is_new: false,
    staff_id: "s1",
    staff_name: "Njeri",
    total_kes: 1500,
    client: null,
    services: [{ name: "Silk press", duration_min: 30, price_kes: 1500 }],
  };

  it("titles the upcoming card and past visits as in 05", () => {
    expect(upcomingTitle(booking, TZ)).toBe("Upcoming · Mon 5 Oct, 10:30");
    expect(pastVisitLine({ ...booking, starts_at: "2026-09-14T07:00:00Z" }, TZ, NOW)).toBe(
      "14 Sep · with Njeri",
    );
  });

  it("reads get_client_profile", () => {
    const parsed = parseProfile({
      client: {
        id: "c1",
        full_name: "Wanjiru Otieno",
        phone: null,
        phone_verified: false,
        notes: null,
        has_account: false,
      },
      stats: { visits: 6, spent_kes: 9600, avg_gap_days: 35.5, no_shows: 1 },
      upcoming: booking,
      past: [],
    });
    expect(parsed.upcoming?.staff_name).toBe("Njeri");
  });

  it("reads get_clients", () => {
    const parsed = parseClientList({
      counts: { all: 1, new: 0, regular: 1, lapsed: 0 },
      clients: [client()],
    });
    expect(parsed.clients[0]!.full_name).toBe("Grace Mutua");
  });
});

describe("adding a client", () => {
  it("needs a name; the phone is optional and normalised", () => {
    expect(clientFormResult({ name: "  ", phone: "" })).toMatchObject({ ok: false, field: "name" });
    expect(clientFormResult({ name: "Mary Wambui", phone: "" })).toEqual({
      ok: true,
      name: "Mary Wambui",
      phone: null,
    });
    expect(clientFormResult({ name: " Mary ", phone: "0700 000 046" })).toEqual({
      ok: true,
      name: "Mary",
      phone: "+254700000046",
    });
    expect(clientFormResult({ name: "Mary", phone: "12" })).toMatchObject({
      ok: false,
      field: "phone",
      message: "Enter a valid phone number",
    });
    expect(clientFormResult({ name: "x".repeat(81), phone: "" })).toMatchObject({ ok: false });
  });

  it("names the client who already has the number", () => {
    expect(duplicatePhoneMessage("Wanjiru Otieno")).toBe(
      "That number already belongs to Wanjiru Otieno",
    );
  });
});
