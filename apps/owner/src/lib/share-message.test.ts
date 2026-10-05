import { defaultShareMessage } from "@bookflow/shared";
import { describe, expect, it } from "vitest";

import { initialShareMessage, shareMessageToStore } from "./share-message";

const NAME = "Salome Saloon";

describe("the share message", () => {
  it("starts from the saved message, else the default", () => {
    expect(initialShareMessage("Karibu!", NAME)).toBe("Karibu!");
    expect(initialShareMessage(null, NAME)).toBe(defaultShareMessage(NAME));
    expect(initialShareMessage("  ", NAME)).toBe(defaultShareMessage(NAME));
  });

  it("stores null for the default or a blank message", () => {
    expect(shareMessageToStore(defaultShareMessage(NAME), NAME)).toBeNull();
    expect(shareMessageToStore(` ${defaultShareMessage(NAME)}\n`, NAME)).toBeNull();
    expect(shareMessageToStore("   ", NAME)).toBeNull();
  });

  it("stores the owner's own message trimmed", () => {
    expect(shareMessageToStore("  Karibu! Book here ", NAME)).toBe("Karibu! Book here");
  });
});
