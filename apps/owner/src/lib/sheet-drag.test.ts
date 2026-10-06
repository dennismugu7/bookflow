import { describe, expect, it } from "vitest";

import { closesSheet, sheetOffset, startsSheetDrag } from "./sheet-drag";

describe("sheet drag", () => {
  it("starts only on a clear downward move", () => {
    expect(startsSheetDrag(0, 4)).toBe(false);
    expect(startsSheetDrag(0, 12)).toBe(true);
    expect(startsSheetDrag(20, 12)).toBe(false);
    expect(startsSheetDrag(0, -30)).toBe(false);
  });

  it("closes past a quarter of the sheet, at most 120 pt", () => {
    expect(closesSheet(70, 0, 300)).toBe(false);
    expect(closesSheet(75, 0, 300)).toBe(true);
    expect(closesSheet(119, 0, 900)).toBe(false);
    expect(closesSheet(120, 0, 900)).toBe(true);
    expect(closesSheet(47, 0, 100)).toBe(false);
    expect(closesSheet(48, 0, 100)).toBe(true);
  });

  it("closes on a quick flick, springs back on a slow short drag", () => {
    expect(closesSheet(30, 1.2, 600)).toBe(true);
    expect(closesSheet(30, 0.3, 600)).toBe(false);
    expect(closesSheet(4, 2, 600)).toBe(false);
  });

  it("follows the finger down only", () => {
    expect(sheetOffset(40)).toBe(40);
    expect(sheetOffset(-25)).toBe(0);
  });
});
