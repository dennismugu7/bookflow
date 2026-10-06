import { describe, expect, it } from "vitest";

import { confirmErrorOutcome, holdErrorResponse } from "./booking-messages";
import { clientIpFrom } from "./holds";
import { buildIcs } from "./ics";
import { phoneFromField } from "./phone-field";
import { safeNext } from "./redirect";
import {
  addDays,
  countdown,
  dayStrip,
  formatDuration,
  formatLongDate,
  formatTime,
  isoWeekday,
  salonDate,
} from "./time";

describe("clientIpFrom (extra cases)", () => {
  it("prefers x-real-ip over x-vercel-forwarded-for", () => {
    expect(
      clientIpFrom(
        new Headers({ "x-real-ip": "203.0.113.9", "x-vercel-forwarded-for": "198.51.100.7" }),
      ),
    ).toBe("203.0.113.9");
  });
  it("trims spaces", () => {
    expect(
      clientIpFrom(new Headers({ "x-vercel-forwarded-for": "  198.51.100.7 ,10.0.0.1" })),
    ).toBe("198.51.100.7");
  });
  it("falls back when x-real-ip is empty", () => {
    expect(
      clientIpFrom(new Headers({ "x-real-ip": " ", "x-vercel-forwarded-for": "198.51.100.7" })),
    ).toBe("198.51.100.7");
  });
});

describe("hold error mapping", () => {
  it.each([
    ["BF409", 409, "That time was just taken. Pick another."],
    ["BF429", 429, "Too many tries. Wait a while and try again."],
    ["BF404", 400, expect.any(String)],
    ["BF400", 400, expect.any(String)],
    ["XX000", 500, expect.any(String)],
  ])("maps %s", (code, status, message) => {
    expect(holdErrorResponse({ code })).toMatchObject({ status, message });
  });
  it("never passes database text through", () => {
    const res = holdErrorResponse({
      code: "BF409",
      message: "Slot not available (staff b000…)",
    } as never);
    expect(res.message).not.toMatch(/staff/);
  });
});

describe("confirm error mapping", () => {
  it.each([
    ["BF410", "expired"],
    ["BF404", "expired"],
    ["BF400", "invalid"],
    ["BF401", "signin"],
    ["42501", "signin"],
    [undefined, "unknown"],
  ])("maps %s to %s", (code, kind) => {
    expect(confirmErrorOutcome(code ? { code } : null).kind).toBe(kind);
  });
});

describe("times in the salon's timezone", () => {
  const tz = "Africa/Nairobi";
  // 07:30 UTC is 10:30 in Nairobi (UTC+3), whatever the machine's timezone.
  const slot = "2026-10-10T07:30:00Z";

  it("formats 12-hour times", () => {
    expect(formatTime(slot, tz)).toBe("10:30 am");
    expect(formatTime("2026-10-10T12:00:00Z", tz)).toBe("3:00 pm");
    expect(formatTime("2026-10-09T21:00:00Z", tz)).toBe("12:00 am");
  });
  it("formats the long date in the salon's day", () => {
    // 22:30 UTC on the 9th is already the 10th in Nairobi.
    expect(formatLongDate("2026-10-09T22:30:00Z", tz)).toBe("Saturday, 10 October");
    expect(salonDate(new Date("2026-10-09T22:30:00Z"), tz)).toBe("2026-10-10");
  });
  it("builds a 14-day strip starting today in the salon", () => {
    const strip = dayStrip(new Date("2026-10-09T22:30:00Z"), tz);
    expect(strip).toHaveLength(14);
    expect(strip[0]).toEqual({
      date: "2026-10-10",
      weekday: "Today",
      dayOfMonth: "10",
      month: "Oct",
    });
    expect(strip[1]).toMatchObject({ date: "2026-10-11", weekday: "Sun" });
    expect(strip[13]?.date).toBe("2026-10-23");
  });
  it("handles month ends and weekdays", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(isoWeekday("2026-10-05")).toBe(1);
    expect(isoWeekday("2026-10-11")).toBe(7);
  });
  it("counts down a hold", () => {
    expect(countdown("2026-10-10T07:40:00Z", new Date("2026-10-10T07:30:19Z"))).toEqual({
      seconds: 581,
      label: "9:41",
    });
    expect(countdown("2026-10-10T07:40:00Z", new Date("2026-10-10T07:45:00Z")).seconds).toBe(0);
  });
  it("formats durations", () => {
    expect(formatDuration(30)).toBe("30 mins");
    expect(formatDuration(135)).toBe("2h 15 mins");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(
    {
      id: "f0000000-0000-4000-8000-000000000031",
      startsAt: "2026-10-10T07:30:00Z",
      endsAt: "2026-10-10T08:30:00Z",
      salonName: "Salome Salon",
      services: ["Braids", "Trim"],
      staffName: "Njeri",
      address: "Galana Plaza, Kilimani; 2nd floor",
      url: "https://bookflow.mugu-labs.com/b/f0000000-0000-4000-8000-000000000031",
    },
    new Date("2026-10-03T12:00:00Z"),
  );

  it("is a valid single-event calendar in UTC", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261010T073000Z");
    expect(ics).toContain("DTEND:20261010T083000Z");
    expect(ics).toContain("DTSTAMP:20261003T120000Z");
    expect(ics).toContain("UID:f0000000-0000-4000-8000-000000000031@bookflow");
  });
  it("escapes text fields", () => {
    expect(ics).toContain("SUMMARY:Braids\\, Trim at Salome Salon");
    expect(ics).toContain("LOCATION:Galana Plaza\\, Kilimani\\; 2nd floor");
  });
  it("folds long lines to 75 characters", () => {
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });
});

describe("safeNext", () => {
  it.each([
    ["/s/salome/confirm", "/s/salome/confirm"],
    ["/s/salome/confirm?services=a,b", "/s/salome/confirm?services=a,b"],
    ["https://evil.example/x", "/"],
    ["//evil.example/x", "/"],
    ["/\\evil.example", "/"],
    ["", "/"],
    [null, "/"],
  ])("turns %j into %j", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe("phoneFromField", () => {
  it.each([
    ["700 000 021", "+254700000021"],
    ["110000021", "+254110000021"],
    ["0700 000 021", "+254700000021"],
    ["+254700000021", "+254700000021"],
  ])("reads %j as %j", (input, expected) => {
    expect(phoneFromField(input)).toBe(expected);
  });
  it.each(["12345", "800 000 021", ""])("rejects %j", (input) => {
    expect(phoneFromField(input)).toBeNull();
  });
});
