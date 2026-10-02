import { describe, expect, it } from "vitest";

import { BOOKING_ERROR_CODES, bookingErrorKind, isBookingErrorCode } from "./booking-errors";

describe("booking error codes", () => {
  it("covers every code the database raises", () => {
    expect(Object.keys(BOOKING_ERROR_CODES).sort()).toEqual(
      ["42501", "BF400", "BF401", "BF403", "BF404", "BF409", "BF410", "BF422", "BF429"].sort(),
    );
  });

  it.each([
    ["BF400", "invalid_input"],
    ["BF401", "phone_required"],
    ["BF403", "business_rule"],
    ["BF404", "not_found"],
    ["BF409", "slot_unavailable"],
    ["BF410", "hold_expired"],
    ["BF422", "invalid_status_change"],
    ["BF429", "rate_limited"],
    ["42501", "not_allowed"],
  ])("maps %s to %s", (code, kind) => {
    expect(bookingErrorKind(code)).toBe(kind);
  });

  it.each([undefined, null, "", "23505", "bf409", "PGRST116"])("returns null for %j", (code) => {
    expect(bookingErrorKind(code)).toBeNull();
  });

  it("reads the code from a Supabase/PostgREST error object", () => {
    expect(bookingErrorKind({ code: "BF409", message: "Slot not available" })).toBe(
      "slot_unavailable",
    );
    expect(bookingErrorKind({ message: "network down" })).toBeNull();
  });

  it("narrows unknown strings to known codes", () => {
    expect(isBookingErrorCode("BF410")).toBe(true);
    expect(isBookingErrorCode("BF999")).toBe(false);
  });
});
