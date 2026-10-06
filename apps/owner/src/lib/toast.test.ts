import { describe, expect, it, vi } from "vitest";

import { BOOKING_SAVED, CHANGES_SAVED, getToast, showToast, subscribeToast } from "./toast";

describe("toast", () => {
  it("says Changes saved by default and tells the host", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToast(listener);
    showToast();
    expect(getToast()?.text).toBe(CHANGES_SAVED);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    showToast(BOOKING_SAVED);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("gives each toast a new id, so the same text shows again", () => {
    showToast();
    const first = getToast()!.id;
    showToast();
    expect(getToast()!.id).toBeGreaterThan(first);
    expect(getToast()!.text).toBe("Changes saved");
    expect(BOOKING_SAVED).toBe("Booking saved");
  });
});
