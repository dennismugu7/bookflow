import { describe, expect, it } from "vitest";

import { defaultShareMessage, shareText } from "./index";

describe("booking link sharing", () => {
  it("has a friendly default message", () => {
    expect(defaultShareMessage("Salome Saloon")).toBe(
      "Book your next visit at Salome Saloon. It takes less than a minute 👇",
    );
  });

  it("puts the link on its own line after the message", () => {
    expect(shareText("Hi there", "https://example.test/s/a", "Salome Saloon")).toBe(
      "Hi there\nhttps://example.test/s/a",
    );
  });

  it("uses the default when the message is blank", () => {
    expect(shareText("   ", "https://example.test/s/a", "Salome Saloon")).toBe(
      "Book your next visit at Salome Saloon. It takes less than a minute 👇\nhttps://example.test/s/a",
    );
    expect(shareText(null, "https://example.test/s/a", "Salome Saloon")).toBe(
      "Book your next visit at Salome Saloon. It takes less than a minute 👇\nhttps://example.test/s/a",
    );
  });
});
