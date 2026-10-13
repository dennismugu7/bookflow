import { describe, expect, it } from "vitest";

import {
  clientSearchFilter,
  createBookingErrorMessage,
  dayOptions,
  eligibleStaff,
  newBookingError,
  statusErrorMessage,
  timeOptions,
  totals,
  whenLabel,
  whenTimes,
  withinOpeningHours,
  type ClientChoice,
} from "./new-booking";

const TZ = "Africa/Nairobi";
const services = [
  { id: "silk", name: "Silk press", duration_min: 30, price_kes: 1500 },
  { id: "trim", name: "Trim", duration_min: 30, price_kes: 1000 },
  { id: "wash", name: "Wash & set", duration_min: 45, price_kes: 1200 },
];
const staff = [
  { id: "njeri", name: "Njeri", serviceIds: ["silk", "trim", "wash"] },
  { id: "salome", name: "Salome", serviceIds: ["trim"] },
];

describe("New booking", () => {
  it("offers only staff who do every selected service", () => {
    expect(eligibleStaff(staff, []).map((s) => s.id)).toEqual(["njeri", "salome"]);
    expect(eligibleStaff(staff, ["trim"]).map((s) => s.id)).toEqual(["njeri", "salome"]);
    expect(eligibleStaff(staff, ["silk", "wash"]).map((s) => s.id)).toEqual(["njeri"]);
  });

  it("adds up time and price, and labels the When field", () => {
    expect(totals(services, ["silk", "wash"])).toEqual({ minutes: 75, totalKes: 2700 });
    expect(whenLabel(new Date("2026-10-03T09:00:00Z"), 75, TZ)).toBe("Sat 3 Oct · 12:00 – 13:15");
  });

  it("checks the booking fits in a day's opening hours", () => {
    const hours = [
      { weekday: 6, opens: "09:00:00", closes: "13:00:00" },
      { weekday: 6, opens: "14:00:00", closes: "18:00:00" },
    ];
    const sat = (time: string) => new Date(`2026-10-03T${time}:00+03:00`);
    expect(withinOpeningHours(hours, sat("09:00"), 60, TZ)).toBe(true);
    expect(withinOpeningHours(hours, sat("12:30"), 30, TZ)).toBe(true);
    expect(withinOpeningHours(hours, sat("12:30"), 45, TZ)).toBe(false);
    expect(withinOpeningHours(hours, sat("08:45"), 30, TZ)).toBe(false);
    expect(withinOpeningHours(hours, sat("17:45"), 30, TZ)).toBe(false);
    expect(withinOpeningHours(hours, new Date("2026-10-04T10:00:00+03:00"), 30, TZ)).toBe(false);
  });

  it("offers two weeks of days and quarter-hour times", () => {
    const days = dayOptions(new Date("2026-10-03T20:59:00Z"), TZ);
    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({ date: "2026-10-03", label: "Sat 3 Oct" });
    expect(dayOptions(new Date("2026-10-03T21:00:00Z"), TZ)[0]!.date).toBe("2026-10-04");
    const times = timeOptions();
    expect(times[0]).toBe("06:00");
    expect(times[1]).toBe("06:15");
    expect(times.at(-1)).toBe("22:00");
  });

  it("says what's missing before saving", () => {
    const base = { serviceIds: ["silk"], staffId: "njeri" };
    const fresh = (name: string, phone: string): ClientChoice => ({ kind: "new", name, phone });
    const known: ClientChoice = { kind: "existing", id: "c", name: "A", phone: null };
    expect(newBookingError({ ...base, client: fresh(" ", "") })?.field).toBe("client");
    expect(newBookingError({ ...base, client: fresh("Mary", "12") })).toEqual({
      field: "phone",
      message: "Enter a valid phone number",
    });
    expect(newBookingError({ ...base, client: fresh("Mary", "") })).toBeUndefined();
    expect(newBookingError({ ...base, client: fresh("Mary", "0712 345 678") })).toBeUndefined();
    expect(newBookingError({ ...base, serviceIds: [], client: known })?.field).toBe("services");
    expect(newBookingError({ ...base, staffId: undefined, client: known })?.field).toBe("staff");
  });

  it("explains database errors kindly", () => {
    expect(createBookingErrorMessage({ code: "BF409" })).toBe("That time is taken. Pick another.");
    expect(createBookingErrorMessage({ code: "42501" })).toBe(
      "Only the salon owner can add bookings.",
    );
    expect(createBookingErrorMessage(null)).toMatch(/connection/);
    expect(statusErrorMessage({ code: "BF422" })).toMatch(/already changed/);
  });

  it("searches names and phones, as typed", () => {
    expect(clientSearchFilter("  ")).toBeNull();
    expect(clientSearchFilter("Mary")).toBe("full_name.ilike.*Mary*");
    expect(clientSearchFilter("0712 34")).toBe("full_name.ilike.*0712 34*,phone.like.*71234*");
    expect(clientSearchFilter("a,b(c)")).toBe("full_name.ilike.*a b c*");
  });
});

describe("whenTimes", () => {
  it("is New booking's grid, with an off-grid time slotted in order", () => {
    expect(whenTimes("09:00")).toEqual(timeOptions());
    const times = whenTimes("09:05");
    expect(times).toHaveLength(timeOptions().length + 1);
    expect(times.slice(times.indexOf("09:00"), times.indexOf("09:00") + 3)).toEqual([
      "09:00",
      "09:05",
      "09:15",
    ]);
  });

  it("leaves out times already past today when moving a booking", () => {
    // 14:10 in Nairobi.
    const after = new Date("2026-10-13T11:10:00Z");
    const today = whenTimes("16:00", { date: "2026-10-13", timeZone: TZ, after });
    expect(today[0]).toBe("14:15");
    expect(today).toContain("16:00");
    expect(today).not.toContain("14:00");
  });

  it("keeps every time on a later day", () => {
    const after = new Date("2026-10-13T11:10:00Z");
    expect(whenTimes("09:00", { date: "2026-10-14", timeZone: TZ, after })).toEqual(timeOptions());
  });

  it("drops the current time too when it has passed (a booking that has started)", () => {
    const after = new Date("2026-10-13T11:10:00Z");
    expect(whenTimes("13:05", { date: "2026-10-13", timeZone: TZ, after })).not.toContain("13:05");
  });
});
