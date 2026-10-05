import { describe, expect, it } from "vitest";

import { defaultShareMessage, shareText } from "./share";

describe("shareText (extra cases)", () => {
  it("trims the owner's message", () => {
    expect(shareText("  Karibu!\n", "https://example.test/s/a", "Salon A")).toBe(
      "Karibu!\nhttps://example.test/s/a",
    );
  });

  it("uses the default when the message is undefined or empty", () => {
    const expected = `${defaultShareMessage("Salon A")}\nhttps://example.test/s/a`;
    expect(shareText(undefined, "https://example.test/s/a", "Salon A")).toBe(expected);
    expect(shareText("", "https://example.test/s/a", "Salon A")).toBe(expected);
  });

  it("keeps line breaks inside the message", () => {
    expect(shareText("Line 1\nLine 2", "https://x.test", "S")).toBe(
      "Line 1\nLine 2\nhttps://x.test",
    );
  });
});
