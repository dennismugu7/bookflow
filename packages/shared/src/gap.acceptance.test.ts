import { describe, expect, it } from "vitest";

import { formatUsualGap } from "./index";

describe("formatUsualGap", () => {
  it("shows the usual gap between visits in weeks or days", () => {
    expect(formatUsualGap(35)).toBe("~5 wks");
    expect(formatUsualGap(10)).toBe("~10 days");
    expect(formatUsualGap(7)).toBe("~1 wk");
    expect(formatUsualGap(null)).toBe("—");
  });
});
