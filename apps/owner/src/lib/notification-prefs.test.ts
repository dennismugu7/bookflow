import { describe, expect, it } from "vitest";

import { phonePermission, prefsArgs, prefsSchema, shouldShowIntro } from "./notification-prefs";

describe("notification prefs", () => {
  it("reads the RPC's JSON and sends it back as arguments", () => {
    const prefs = prefsSchema.parse({
      new_bookings: true,
      cancellations: false,
      morning_summary: true,
    });
    expect(prefsArgs(prefs)).toEqual({
      p_new_bookings: true,
      p_cancellations: false,
      p_morning_summary: true,
    });
    expect(prefsSchema.safeParse({ new_bookings: true }).success).toBe(false);
  });

  it("tells granted, askable and blocked permissions apart", () => {
    expect(phonePermission({ granted: true, canAskAgain: false })).toBe("granted");
    expect(phonePermission({ granted: false, canAskAgain: true })).toBe("can-ask");
    expect(phonePermission({ granted: false, canAskAgain: false })).toBe("blocked");
  });

  it("shows the intro once, and never when notifications are already allowed", () => {
    expect(shouldShowIntro(false, "can-ask")).toBe(true);
    expect(shouldShowIntro(false, "blocked")).toBe(true);
    expect(shouldShowIntro(true, "can-ask")).toBe(false);
    expect(shouldShowIntro(false, "granted")).toBe(false);
  });
});
