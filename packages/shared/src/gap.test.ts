import { describe, expect, it } from "vitest";

import { formatUsualGap } from "./gap";

describe("formatUsualGap, edges", () => {
  it("rounds fractional days and weeks", () => {
    expect(formatUsualGap(33.5)).toBe("~5 wks");
    expect(formatUsualGap(13.4)).toBe("~13 days");
    expect(formatUsualGap(14)).toBe("~2 wks");
    expect(formatUsualGap(6.6)).toBe("~1 wk");
  });

  it("never shows zero days", () => {
    expect(formatUsualGap(0)).toBe("~1 day");
    expect(formatUsualGap(1)).toBe("~1 day");
  });

  it("shows a dash when there is nothing to show", () => {
    expect(formatUsualGap(undefined)).toBe("—");
    expect(formatUsualGap(Number.NaN)).toBe("—");
    expect(formatUsualGap(-3)).toBe("—");
  });
});
