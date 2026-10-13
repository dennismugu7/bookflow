import { describe, expect, it, vi } from "vitest";

import { SKELETON_DELAY_MS, listPhase, skeletonVisible } from "./list-phase";

const isEmpty = (list: string[]) => list.length === 0;

describe("listPhase (QA report 8663, M-01)", () => {
  it("is loading until the first answer arrives, never empty", () => {
    expect(listPhase<string[]>(undefined, undefined, isEmpty)).toBe("loading");
  });

  it("does not ask whether missing data is empty", () => {
    const spy = vi.fn(() => true);
    expect(listPhase<string[]>(undefined, undefined, spy)).toBe("loading");
    expect(spy).not.toHaveBeenCalled();
  });

  it("is an error when the first load fails", () => {
    expect(listPhase<string[]>(undefined, "Couldn't load", isEmpty)).toBe("error");
  });

  it("is an error when a later load fails, even with data on screen", () => {
    expect(listPhase(["Elena Brooks"], "Couldn't load", isEmpty)).toBe("error");
  });

  it("is empty only once the server says there is nothing", () => {
    expect(listPhase<string[]>([], undefined, isEmpty)).toBe("empty");
  });

  it("is ready when there is something to show", () => {
    expect(listPhase(["Elena Brooks"], undefined, isEmpty)).toBe("ready");
  });
});

describe("skeletonVisible", () => {
  it("waits 200 ms, so a fast load doesn't flash", () => {
    expect(SKELETON_DELAY_MS).toBe(200);
    expect(skeletonVisible("loading", 0)).toBe(false);
    expect(skeletonVisible("loading", 199)).toBe(false);
    expect(skeletonVisible("loading", 200)).toBe(true);
    expect(skeletonVisible("loading", 5000)).toBe(true);
  });

  it("never shows once loading is over", () => {
    expect(skeletonVisible("ready", 5000)).toBe(false);
    expect(skeletonVisible("empty", 5000)).toBe(false);
    expect(skeletonVisible("error", 5000)).toBe(false);
  });
});
