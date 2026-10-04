import { describe, expect, it } from "vitest";

import {
  EXAMPLE,
  FINAL_AT,
  LOOP_MS,
  TRACKS,
  cssEase,
  remainingMs,
  sample,
  welcomeDay,
} from "./welcome-motion";

describe("cssEase", () => {
  it("is CSS's default `ease` curve", () => {
    expect(cssEase(0)).toBe(0);
    expect(cssEase(1)).toBe(1);
    // Chrome's values for `ease` at 25, 50 and 75 %.
    expect(cssEase(0.25)).toBeCloseTo(0.4085, 3);
    expect(cssEase(0.5)).toBeCloseTo(0.8024, 3);
    expect(cssEase(0.75)).toBeCloseTo(0.9604, 3);
  });
});

describe("TRACKS", () => {
  it("are timed on the 6-second sequence of the HTML", () => {
    expect(LOOP_MS).toBe(6000);
  });

  it("are valid Animated ranges: increasing inputs from 0 to 1, one output per input", () => {
    for (const [name, track] of Object.entries(TRACKS)) {
      expect(track.inputRange[0], name).toBe(0);
      expect(track.inputRange.at(-1), name).toBe(1);
      expect(track.outputRange.length, name).toBe(track.inputRange.length);
      for (let i = 1; i < track.inputRange.length; i++) {
        expect(track.inputRange[i]!, name).toBeGreaterThan(track.inputRange[i - 1]!);
      }
    }
  });

  it("follows the keyframes of 10-welcome-animation.html", () => {
    // Beat 1: the link bubble is in by 6 %, and the tap ring peaks at 18 %.
    expect(sample(TRACKS.bubbleOpacity, 0)).toBe(0);
    expect(sample(TRACKS.bubbleOpacity, 0.06)).toBe(1);
    expect(sample(TRACKS.tap1Opacity, 0.18)).toBe(1);
    expect(sample(TRACKS.tap1Scale, 0.26)).toBe(1.6);
    // Beat 2: the chips are in by 36 %, the middle one turns purple from 47 % to 52 %.
    expect(sample(TRACKS.timesOpacity, 0.28)).toBe(0);
    expect(sample(TRACKS.timesOpacity, 0.36)).toBe(1);
    expect(sample(TRACKS.tap2Opacity, 0.48)).toBe(1);
    expect(sample(TRACKS.pick, 0.47)).toBe(0);
    expect(sample(TRACKS.pick, 0.52)).toBe(1);
    // Beat 3: Today is in by 62 %; the new booking pops past its place at 72 % and settles at 76 %.
    expect(sample(TRACKS.todayOpacity, 0.55)).toBe(0);
    expect(sample(TRACKS.todayOpacity, 0.62)).toBe(1);
    expect(sample(TRACKS.dropOpacity, 0.66)).toBe(0);
    expect(sample(TRACKS.dropScale, 0.72)).toBe(1.02);
    expect(sample(TRACKS.dropY, 0.72)).toBe(2);
    expect(sample(TRACKS.dropScale, 0.76)).toBe(1);
    // In the HTML loop, everything fades out by 96 %.
    for (const name of ["bubbleOpacity", "timesOpacity", "todayOpacity", "dropOpacity"] as const) {
      expect(sample(TRACKS[name], 0.96), name).toBe(0);
    }
  });

  it("eases between keyframes like CSS", () => {
    // Halfway through the bubble's fade-in (0 → 6 %), CSS `ease` is ~80 % of the way.
    expect(sample(TRACKS.bubbleOpacity, 0.03)).toBeCloseTo(0.8, 1);
  });
});

describe("FINAL_AT", () => {
  it("is the final frame: every card in, the time picked, no tap rings", () => {
    expect(sample(TRACKS.bubbleOpacity, FINAL_AT)).toBe(1);
    expect(sample(TRACKS.timesOpacity, FINAL_AT)).toBe(1);
    expect(sample(TRACKS.pick, FINAL_AT)).toBe(1);
    expect(sample(TRACKS.todayOpacity, FINAL_AT)).toBe(1);
    expect(sample(TRACKS.dropOpacity, FINAL_AT)).toBe(1);
    expect(sample(TRACKS.dropScale, FINAL_AT)).toBe(1);
    expect(sample(TRACKS.dropY, FINAL_AT)).toBe(0);
    expect(sample(TRACKS.bubbleY, FINAL_AT)).toBe(0);
    expect(sample(TRACKS.tap1Opacity, FINAL_AT)).toBe(0);
    expect(sample(TRACKS.tap2Opacity, FINAL_AT)).toBe(0);
  });

  it("comes after the last movement and before the loop's fade-out", () => {
    // The new booking settles at 76 %; the HTML loop starts fading out at 88 %.
    for (const track of Object.values(TRACKS)) {
      expect(sample(track, 0.76)).toBe(sample(track, FINAL_AT));
      expect(sample(track, 0.88)).toBe(sample(track, FINAL_AT));
    }
  });
});

describe("remainingMs", () => {
  it("plays the sequence once, from the start, at the HTML's pace", () => {
    expect(remainingMs(0)).toBe(FINAL_AT * LOOP_MS);
  });

  it("resumes from where it paused", () => {
    expect(remainingMs(0.5)).toBeCloseTo((FINAL_AT - 0.5) * LOOP_MS);
  });

  it("does not move again once it holds the final frame", () => {
    expect(remainingMs(FINAL_AT)).toBe(0);
    expect(remainingMs(1)).toBe(0);
  });
});

describe("EXAMPLE", () => {
  it("is the first example of the HTML only (hair)", () => {
    expect(EXAMPLE).toEqual({
      services: "Silk press, braids & more",
      time: "10:30",
      who: "Silk press · Wanjiru",
    });
  });
});

describe("welcomeDay", () => {
  it("writes the day like the mockup's Today card", () => {
    expect(welcomeDay(new Date("2026-10-04T09:00:00Z"), "Africa/Nairobi")).toBe("Sun 4 Oct");
  });
});
