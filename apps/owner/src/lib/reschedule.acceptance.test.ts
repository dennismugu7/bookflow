import { describe, expect, it } from "vitest";

import { canReschedule, rescheduleErrorMessage } from "./reschedule";

describe("canReschedule (QA report 8663, S-01)", () => {
  it("lets an owner move a confirmed booking", () => {
    expect(canReschedule({ status: "confirmed" }, { isOwner: true })).toBe(true);
  });

  it("does not let staff move bookings", () => {
    expect(canReschedule({ status: "confirmed" }, { isOwner: false })).toBe(false);
  });

  it("does not move bookings that are finished", () => {
    expect(canReschedule({ status: "completed" }, { isOwner: true })).toBe(false);
    expect(canReschedule({ status: "no_show" }, { isOwner: true })).toBe(false);
  });
});

describe("rescheduleErrorMessage", () => {
  it("names each failure", () => {
    expect(rescheduleErrorMessage({ code: "BF409" })).toBe("That time is taken. Pick another.");
    expect(rescheduleErrorMessage({ code: "BF400" })).toBe("Pick a time in the future.");
    expect(rescheduleErrorMessage({ code: "BF422" })).toBe(
      "This booking has already changed. Pull down to refresh.",
    );
    expect(rescheduleErrorMessage({ code: "BF404" })).toBe(
      "This booking is no longer here. Pull down to refresh.",
    );
    expect(rescheduleErrorMessage({ code: "42501" })).toBe(
      "Only the salon owner can move a booking.",
    );
  });

  it("falls back to a connection message", () => {
    const fallback = "Couldn't move the booking. Check your connection and try again.";
    expect(rescheduleErrorMessage({ code: "XX000" })).toBe(fallback);
    expect(rescheduleErrorMessage(null)).toBe(fallback);
    expect(rescheduleErrorMessage(undefined)).toBe(fallback);
  });
});
