import { describe, expect, it } from "vitest";

import {
  MAX_PHOTOS,
  canAddPhoto,
  makeBanner,
  photoCount,
  photoPaths,
  removePhoto,
  samePaths,
  unusedPaths,
  type PhotoItem,
} from "./photos";

const photo = (n: number, uploaded = true): PhotoItem => ({
  key: `k${n}`,
  path: uploaded ? `salon/banner/${n}.jpg` : undefined,
  localUri: uploaded ? undefined : `file:///${n}.jpg`,
});

describe("salon photos", () => {
  it("allows up to six", () => {
    const five = [1, 2, 3, 4, 5].map((n) => photo(n));
    expect(canAddPhoto(five)).toBe(true);
    expect(canAddPhoto([...five, photo(6)])).toBe(false);
    expect(MAX_PHOTOS).toBe(6);
  });

  it("counts them as in the mockup", () => {
    expect(photoCount([photo(1), photo(2), photo(3)])).toBe("3 of 6");
    expect(photoCount([])).toBe("0 of 6");
  });

  it("moves the new banner first and keeps the others in order", () => {
    const keys = makeBanner([photo(1), photo(2), photo(3)], "k3").map((p) => p.key);
    expect(keys).toEqual(["k3", "k1", "k2"]);
    expect(makeBanner([photo(1)], "missing").map((p) => p.key)).toEqual(["k1"]);
  });

  it("removes a photo", () => {
    expect(removePhoto([photo(1), photo(2)], "k1").map((p) => p.key)).toEqual(["k2"]);
  });

  it("has no paths to save while a photo is uploading", () => {
    expect(photoPaths([photo(1), photo(2)])).toEqual(["salon/banner/1.jpg", "salon/banner/2.jpg"]);
    expect(photoPaths([photo(1), photo(2, false)])).toBeUndefined();
    expect(photoPaths([])).toEqual([]);
  });

  it("compares paths in order", () => {
    expect(samePaths(["a", "b"], ["a", "b"])).toBe(true);
    expect(samePaths(["a", "b"], ["b", "a"])).toBe(false);
    expect(samePaths(["a"], ["a", "b"])).toBe(false);
  });

  it("lists files no longer used, once each", () => {
    expect(unusedPaths(["a", "b", "c", "c"], ["b"])).toEqual(["a", "c"]);
    expect(unusedPaths([], ["a"])).toEqual([]);
  });
});
