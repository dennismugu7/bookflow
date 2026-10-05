import { describe, expect, it } from "vitest";

import { slideAlt, slideIndex, slidePaths } from "./slider";

describe("photo slider", () => {
  it("uses the photos, else the banner, else nothing", () => {
    expect(slidePaths(["a.jpg", "b.jpg"], "a.jpg")).toEqual(["a.jpg", "b.jpg"]);
    expect(slidePaths([], "banner.jpg")).toEqual(["banner.jpg"]);
    expect(slidePaths([], null)).toEqual([]);
  });

  it("finds the slide in view", () => {
    expect(slideIndex(0, 390, 3)).toBe(0);
    expect(slideIndex(200, 390, 3)).toBe(1);
    expect(slideIndex(780, 390, 3)).toBe(2);
    expect(slideIndex(5000, 390, 3)).toBe(2);
    expect(slideIndex(-20, 390, 3)).toBe(0);
    expect(slideIndex(100, 0, 3)).toBe(0);
  });

  it("describes each photo", () => {
    expect(slideAlt("Salome Saloon", 1, 3)).toBe("Salome Saloon, photo 2 of 3");
  });
});
