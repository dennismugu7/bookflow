import { describe, expect, it } from "vitest";

import {
  END_MS,
  INTRO_MS,
  LOGO,
  REDUCED_MS,
  REDUCED_TRACKS,
  TRACKS,
  cubicBezier,
  logoUnit,
  readyToExit,
} from "./splash-motion";
import { sample, type Track } from "./welcome-motion";

const at = (track: Track, ms: number) => sample(track, ms);
const max = (track: Track) => Math.max(...track.outputRange);

describe("cubicBezier", () => {
  it("runs from 0 to 1", () => {
    const ease = cubicBezier(0.2, 0.8, 0.2, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("matches CSS ease-out halfway", () => {
    // cubic-bezier(0, 0, 0.58, 1) at x = 0.5 is about 0.684.
    expect(cubicBezier(0, 0, 0.58, 1)(0.5)).toBeCloseTo(0.684, 2);
  });

  it("overshoots past 1 for the bowls' curve", () => {
    const back = cubicBezier(0.34, 1.56, 0.64, 1);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(back))).toBeGreaterThan(1.05);
  });
});

describe("splash timeline (spec: splash-animation.md)", () => {
  it("starts on a plain background: frame 0 shows nothing", () => {
    for (const name of ["haloOpacity", "stemOpacity", "topOpacity", "botOpacity"] as const)
      expect(at(TRACKS[name], 0)).toBe(0);
  });

  it("halo: 0.35 at full size by 60 %, then settles at 0.18 and 1.15", () => {
    expect(at(TRACKS.haloScale, 0)).toBe(0.4);
    expect(at(TRACKS.haloOpacity, 1560)).toBeCloseTo(0.35);
    expect(at(TRACKS.haloScale, 1560)).toBeCloseTo(1);
    expect(at(TRACKS.haloOpacity, END_MS)).toBeCloseTo(0.18);
    expect(at(TRACKS.haloScale, END_MS)).toBeCloseTo(1.15);
  });

  it("stem grows up from 0.25 s to 0.80 s", () => {
    expect(at(TRACKS.stemScaleY, 250)).toBe(0);
    expect(at(TRACKS.stemScaleY, 500)).toBeGreaterThan(0.5);
    expect(at(TRACKS.stemScaleY, 800)).toBe(1);
    expect(at(TRACKS.stemOpacity, 800)).toBe(1);
  });

  it("upper bowl sweeps out from 0.65 s with an overshoot, settling by 1.25 s", () => {
    expect(at(TRACKS.topScaleX, 650)).toBe(0);
    expect(max(TRACKS.topScaleX)).toBeGreaterThan(1.05);
    expect(at(TRACKS.topScaleX, 1250)).toBe(1);
  });

  it("lower bowl swings up from -35° and 0.6, settling by 1.70 s", () => {
    expect(at(TRACKS.botRotate, 1000)).toBe(-35);
    expect(at(TRACKS.botScale, 1000)).toBe(0.6);
    expect(max(TRACKS.botRotate)).toBeGreaterThan(0);
    expect(at(TRACKS.botRotate, 1700)).toBe(0);
    expect(at(TRACKS.botScale, 1700)).toBe(1);
  });

  it("opacity never goes past 1, even on the overshoot curves", () => {
    for (const name of ["stemOpacity", "topOpacity", "botOpacity"] as const)
      expect(max(TRACKS[name])).toBe(1);
  });

  it("heartbeat: 1 → 1.06 at 45 % → 1, from 1.75 s to 2.35 s", () => {
    expect(at(TRACKS.markScale, 1750)).toBe(1);
    expect(at(TRACKS.markScale, 1750 + 0.45 * 600)).toBeCloseTo(1.06);
    expect(at(TRACKS.markScale, INTRO_MS)).toBe(1);
  });

  it("the held final frame is the logo at rest with the halo at 0.18", () => {
    expect(at(TRACKS.stemScaleY, END_MS)).toBe(1);
    expect(at(TRACKS.topScaleX, END_MS)).toBe(1);
    expect(at(TRACKS.botRotate, END_MS)).toBe(0);
    expect(at(TRACKS.markScale, END_MS)).toBe(1);
    expect(at(TRACKS.haloOpacity, END_MS)).toBeCloseTo(0.18);
  });
});

describe("reduced motion", () => {
  it("only fades the logo and halo in over 0.4 s", () => {
    expect(REDUCED_MS).toBe(400);
    expect(Object.keys(REDUCED_TRACKS).sort()).toEqual(["haloOpacity", "logoOpacity"]);
    expect(at(REDUCED_TRACKS.logoOpacity, 0)).toBe(0);
    expect(at(REDUCED_TRACKS.logoOpacity, 400)).toBe(1);
    expect(at(REDUCED_TRACKS.haloOpacity, 400)).toBeCloseTo(0.18);
  });
});

describe("readyToExit", () => {
  it("waits for both the heartbeat and the app", () => {
    expect(readyToExit({ introDone: true, appReady: true })).toBe(true);
    // Ready early: still finish through the heartbeat.
    expect(readyToExit({ introDone: false, appReady: true })).toBe(false);
    // Still loading: hold the final frame.
    expect(readyToExit({ introDone: true, appReady: false })).toBe(false);
  });
});

describe("logoUnit", () => {
  it("makes the logo 38 % of the screen width on phones", () => {
    for (const width of [320, 390, 430])
      expect(logoUnit(width, 900) * LOGO.width).toBeCloseTo(width * 0.38);
  });

  it("sizes from the shorter side, so a wide tablet still fits", () => {
    expect(logoUnit(1280, 800) * LOGO.width).toBeCloseTo(800 * 0.38);
  });
});
