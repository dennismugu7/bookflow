import { describe, expect, it } from "vitest";

import { shareImageInitial, shareImagePath, shareImageSubtitle } from "./share-image";

describe("share image", () => {
  it("versions the URL with updated_at", () => {
    expect(shareImagePath("salome-saloon", "2026-10-05T06:00:00.123+00:00")).toBe(
      "/s/salome-saloon/share-image?v=2026-10-05T06%3A00%3A00.123%2B00%3A00",
    );
  });

  it("adds Book online after the area", () => {
    expect(shareImageSubtitle("Kilimani, Nairobi")).toBe("Kilimani, Nairobi · Book online");
    expect(shareImageSubtitle(null)).toBe("Book online");
  });

  it("uses the first letter of the name", () => {
    expect(shareImageInitial(" salome")).toBe("S");
    expect(shareImageInitial("Élan")).toBe("É");
    expect(shareImageInitial("")).toBe("B");
  });
});
