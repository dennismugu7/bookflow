import { describe, expect, it } from "vitest";

import { notificationTarget } from "./notification-target";

describe("notificationTarget (extra cases)", () => {
  const today = "2026-10-05";

  it("opens a past day in the Calendar too", () => {
    expect(
      notificationTarget({ kind: "new_booking", booking_id: "b1", date: "2026-10-01" }, today),
    ).toEqual({ screen: "calendar", date: "2026-10-01", bookingId: "b1" });
  });

  it("ignores data without a date or with a non-string kind", () => {
    expect(notificationTarget({ kind: "new_booking", booking_id: "b1" }, today)).toBeNull();
    expect(notificationTarget({ kind: 1, date: today }, today)).toBeNull();
    expect(notificationTarget("new_booking", today)).toBeNull();
  });

  it("drops an empty booking id", () => {
    expect(
      notificationTarget({ kind: "cancellation", booking_id: "", date: today }, today),
    ).toEqual({ screen: "today", date: today });
  });
});
