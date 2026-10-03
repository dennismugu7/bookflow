import { describe, expect, it } from "vitest";

import {
  cartSummary,
  firstName,
  formatClock,
  formatShortDateTime,
  initials,
  whatsappShareUrl,
} from "./format";
import { describeOpenStatus } from "./open-status";

const tz = "Africa/Nairobi";

describe("format helpers", () => {
  it("formats short dates and clocks in the salon's timezone", () => {
    expect(formatShortDateTime("2026-10-05T07:45:00Z", tz)).toBe("Mon 5 Oct, 10:45");
    expect(formatClock("2026-10-05T08:15:00Z", tz)).toBe("11:15");
    expect(formatClock("2026-10-04T21:00:00Z", tz)).toBe("00:00");
  });
  it("summarises the cart", () => {
    expect(cartSummary(1, 30)).toBe("1 item · 30 mins");
    expect(cartSummary(2, 60)).toBe("2 items · 1h");
    expect(cartSummary(3, 135)).toBe("3 items · 2h 15 mins");
  });
  it("makes initials and first names", () => {
    expect(initials("Njeri Kamau")).toBe("NK");
    expect(initials("  salome  ")).toBe("S");
    expect(initials("Amani Beauty Studio")).toBe("AB");
    expect(firstName("Njeri Kamau")).toBe("Njeri");
  });
  it("builds a WhatsApp share link", () => {
    expect(whatsappShareUrl("Book at Amani:", "https://x.test/s/amani")).toBe(
      "https://wa.me/?text=Book%20at%20Amani%3A%20https%3A%2F%2Fx.test%2Fs%2Famani",
    );
  });
});

describe("describeOpenStatus", () => {
  it.each([
    [{ open: true as const, until: "18:00" }, 1, { label: "Open", detail: "until 18:00" }],
    [
      { open: false as const, next: { weekday: 1, time: "09:00" } },
      6,
      { label: "Closed", detail: "opens Mon 09:00" },
    ],
    [
      { open: false as const, next: { weekday: 1, time: "14:00" } },
      1,
      { label: "Closed", detail: "opens today 14:00" },
    ],
    [{ open: false as const, next: null }, 1, { label: "Closed", detail: "" }],
  ])("describes %j", (status, today, expected) => {
    expect(describeOpenStatus(status, today)).toEqual(expected);
  });
});
