import { describe, expect, it } from "vitest";

import type { AgendaBooking } from "./agenda";
import {
  blockName,
  blockServices,
  blockTone,
  bookingsFor,
  columnsFor,
  headerLabel,
  hourMarks,
  isView,
  lanes,
  minuteOfDay,
  monthGrid,
  monthLabel,
  nowMinute,
  parseRange,
  placeOnScale,
  rangeFor,
  scaleFor,
  shiftDate,
  shiftMonth,
  timeAt,
  timeOffLabel,
  weekStart,
  weekdayHead,
  type CalendarDay,
} from "./calendar";

const TZ = "Africa/Nairobi";

function booking(over: Partial<AgendaBooking> = {}): AgendaBooking {
  return {
    id: "b1",
    status: "confirmed",
    starts_at: "2026-10-03T06:00:00Z", // 09:00 in Nairobi
    ends_at: "2026-10-03T06:30:00Z",
    source: "web",
    is_new: false,
    staff_id: "s1",
    staff_name: "Salome",
    total_kes: 800,
    client: {
      id: "c1",
      full_name: "Brian Kip",
      phone: "+254700000043",
      phone_verified: true,
      visit_number: 2,
    },
    services: [{ name: "Trim", duration_min: 30, price_kes: 800 }],
    ...over,
  };
}

function day(over: Partial<CalendarDay> = {}): CalendarDay {
  return {
    date: "2026-10-03",
    open: [{ opens: "09:00", closes: "17:00" }],
    bookings: [],
    time_off: [],
    ...over,
  };
}

describe("dates and labels", () => {
  it("starts weeks on Monday", () => {
    expect(weekStart("2026-10-03")).toBe("2026-09-28"); // Saturday
    expect(weekStart("2026-09-28")).toBe("2026-09-28"); // Monday
    expect(weekStart("2026-10-04")).toBe("2026-09-28"); // Sunday
  });

  it("loads one day, or Monday to Sunday", () => {
    expect(rangeFor("day", "2026-10-03")).toEqual({ from: "2026-10-03", to: "2026-10-03" });
    expect(rangeFor("list", "2026-10-03")).toEqual({ from: "2026-10-03", to: "2026-10-03" });
    expect(rangeFor("week", "2026-10-03")).toEqual({ from: "2026-09-28", to: "2026-10-04" });
  });

  it("moves a day or a week at a time", () => {
    expect(shiftDate("day", "2026-10-03", 1)).toBe("2026-10-04");
    expect(shiftDate("list", "2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDate("week", "2026-10-03", -1)).toBe("2026-09-26");
  });

  it("labels the header as in 01 and 02", () => {
    expect(headerLabel("day", "2026-10-03", "2026-10-03")).toBe("Today · Sat 3 Oct");
    expect(headerLabel("list", "2026-10-05", "2026-10-03")).toBe("Mon 5 Oct");
    expect(headerLabel("week", "2026-10-03", "2026-10-03")).toBe("28 Sep – 4 Oct");
  });

  it("heads week columns with the weekday and day number", () => {
    expect(weekdayHead("2026-09-28")).toEqual({ weekday: "Mon", day: "28" });
    expect(weekdayHead("2026-10-01")).toEqual({ weekday: "Thu", day: "1" });
  });

  it("knows its views", () => {
    expect(isView("week")).toBe(true);
    expect(isView("month")).toBe(false);
    expect(isView(null)).toBe(false);
  });
});

describe("the time scale", () => {
  it("runs from the earliest opening to the latest closing, in whole hours", () => {
    const days = [
      day({ open: [{ opens: "09:30", closes: "13:00" }] }),
      day({ date: "2026-10-04", open: [{ opens: "10:00", closes: "17:15" }] }),
    ];
    expect(scaleFor(days, TZ)).toEqual({ start: 540, end: 1080 });
  });

  it("widens for bookings outside the hours, and falls back to 09–18 when closed", () => {
    expect(scaleFor([day({ open: [] })], TZ)).toEqual({ start: 540, end: 1080 });
    const late = booking({ starts_at: "2026-10-03T16:00:00Z", ends_at: "2026-10-03T17:30:00Z" });
    expect(scaleFor([day({ bookings: [late] })], TZ)).toEqual({ start: 540, end: 21 * 60 });
  });

  it("marks each hour", () => {
    expect(hourMarks({ start: 540, end: 720 })).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("places spans on the scale and clips them", () => {
    expect(placeOnScale(570, 750, { start: 540, end: 1080 }, 70)).toEqual({ top: 35, height: 210 });
    expect(placeOnScale(480, 600, { start: 540, end: 1080 }, 70)).toEqual({ top: 0, height: 70 });
    expect(placeOnScale(1100, 1200, { start: 540, end: 1080 }, 70)).toBeUndefined();
  });

  it("clamps instants to the day being drawn", () => {
    expect(minuteOfDay("2026-10-03T06:00:00Z", "2026-10-03", TZ)).toBe(540);
    expect(minuteOfDay("2026-10-02T20:00:00Z", "2026-10-03", TZ)).toBe(0); // 23:00 the day before
    expect(minuteOfDay("2026-10-03T22:00:00Z", "2026-10-03", TZ)).toBe(1440); // 01:00 the day after
  });

  it("turns a tap into the nearest quarter hour on the scale", () => {
    const scale = { start: 540, end: 1080 };
    expect(timeAt(0, scale, 70)).toBe("09:00");
    expect(timeAt(70 * 1.2, scale, 70)).toBe("10:15"); // 10:12
    expect(timeAt(70 * 1.1, scale, 70)).toBe("10:00"); // 10:06
    expect(timeAt(70 * 9, scale, 70)).toBe("17:45"); // the last start that fits
    expect(timeAt(Number.NaN, scale, 70)).toBe("09:00");
  });

  it("draws the now-line on today only", () => {
    const scale = { start: 540, end: 1080 };
    const now = new Date("2026-10-03T08:39:00Z"); // 11:39
    expect(nowMinute("2026-10-03", now, TZ, scale)).toBe(699);
    expect(nowMinute("2026-10-04", now, TZ, scale)).toBeUndefined();
    expect(nowMinute("2026-10-03", new Date("2026-10-03T03:00:00Z"), TZ, scale)).toBeUndefined();
  });
});

describe("blocks", () => {
  it("colours by state", () => {
    expect(blockTone(booking({ status: "completed" }), "b1")).toBe("done");
    expect(blockTone(booking({ status: "no_show" }), undefined)).toBe("noShow");
    expect(blockTone(booking(), "b1")).toBe("next");
    expect(blockTone(booking(), "b2")).toBe("upcoming");
  });

  it("shortens the client's name and lists the services", () => {
    expect(blockName(booking())).toBe("Brian K.");
    expect(blockName(booking({ client: { ...booking().client!, full_name: "Cher" } }))).toBe(
      "Cher",
    );
    expect(blockName(booking({ client: null }))).toBe("Walk-in");
    expect(
      blockServices(
        booking({
          services: [
            { name: "Wash & set", duration_min: 45, price_kes: 1200 },
            { name: "Trim", duration_min: 30, price_kes: 800 },
          ],
        }),
      ),
    ).toBe("Wash & set, trim");
  });

  it("labels time off", () => {
    const off = {
      staff_id: "s3",
      starts_at: "2026-10-03T05:00:00Z",
      ends_at: "2026-10-03T09:00:00Z",
      reason: null,
    };
    expect(timeOffLabel(off, "2026-10-03", TZ)).toBe("Off until 12:00");
    expect(timeOffLabel({ ...off, reason: "Training" }, "2026-10-03", TZ)).toBe(
      "Training until 12:00",
    );
    expect(timeOffLabel({ ...off, ends_at: "2026-10-05T09:00:00Z" }, "2026-10-03", TZ)).toBe("Off");
  });

  it("gives active staff a column and filters the week by person", () => {
    const staff = [
      { id: "s1", name: "Salome", photo_path: null, sort_order: 1, active: true },
      { id: "s2", name: "Old", photo_path: null, sort_order: 2, active: false },
    ];
    expect(columnsFor(staff).map((s) => s.name)).toEqual(["Salome"]);
    const d = day({ bookings: [booking(), booking({ id: "b2", staff_id: "s2" })] });
    expect(bookingsFor(d, null)).toHaveLength(2);
    expect(bookingsFor(d, "s2").map((b) => b.id)).toEqual(["b2"]);
  });
});

describe("the date picker", () => {
  it("lays out a month Monday first", () => {
    const grid = monthGrid("2026-10-15");
    expect(grid[0]).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it("names and moves months", () => {
    expect(monthLabel("2026-10-03")).toBe("October 2026");
    expect(shiftMonth("2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-31", -1)).toBe("2025-12-01");
  });
});

describe("parseRange", () => {
  it("reads get_range_agenda", () => {
    const parsed = parseRange({
      staff: [{ id: "s1", name: "Njeri", photo_path: null, sort_order: 0, active: true }],
      days: [day({ bookings: [booking()] })],
    });
    expect(parsed.days[0]!.bookings[0]!.client?.full_name).toBe("Brian Kip");
  });
});

describe("lanes", () => {
  it("puts overlapping bookings side by side and others full width", () => {
    const b = (id: string, from: string, to: string) =>
      booking({ id, starts_at: `2026-10-03T${from}:00Z`, ends_at: `2026-10-03T${to}:00Z` });
    const result = lanes([
      b("a", "06:00", "07:00"),
      b("b", "06:30", "07:30"),
      b("c", "07:00", "08:00"),
      b("d", "09:00", "09:30"),
    ]);
    expect(result.get("a")).toEqual({ lane: 0, of: 2 });
    expect(result.get("b")).toEqual({ lane: 1, of: 2 });
    expect(result.get("c")).toEqual({ lane: 0, of: 2 });
    expect(result.get("d")).toEqual({ lane: 0, of: 1 });
  });
});
