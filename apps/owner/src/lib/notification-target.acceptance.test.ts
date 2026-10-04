import { describe, expect, it } from "vitest";

import { notificationTarget } from "./notification-target";

describe("notificationTarget", () => {
  const today = "2026-10-05";

  it("opens a booking for today on Today", () => {
    expect(
      notificationTarget({ kind: "new_booking", booking_id: "b1", date: "2026-10-05" }, today),
    ).toEqual({ screen: "today", date: "2026-10-05", bookingId: "b1" });
  });

  it("opens a booking on another day in the Calendar's Day view", () => {
    expect(
      notificationTarget({ kind: "cancellation", booking_id: "b2", date: "2026-10-09" }, today),
    ).toEqual({ screen: "calendar", date: "2026-10-09", bookingId: "b2" });
  });

  it("opens Today for the morning summary", () => {
    expect(notificationTarget({ kind: "morning_summary", date: "2026-10-05" }, today)).toEqual({
      screen: "today",
      date: "2026-10-05",
    });
  });

  it("ignores anything it does not recognise", () => {
    expect(notificationTarget({ kind: "other" }, today)).toBeNull();
    expect(notificationTarget(null, today)).toBeNull();
    expect(notificationTarget({ kind: "new_booking", date: "not-a-date" }, today)).toBeNull();
  });
});
