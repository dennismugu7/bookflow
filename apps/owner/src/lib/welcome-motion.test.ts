import { describe, expect, it } from "vitest";

import {
  EXAMPLES,
  LOOP_MS,
  REST_AT,
  TRACKS,
  cssEase,
  nextExample,
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
  it("loops every 6 seconds", () => {
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
    // Everything fades out by 96 %, so the next example swaps in unseen.
    for (const name of ["bubbleOpacity", "timesOpacity", "todayOpacity", "dropOpacity"] as const) {
      expect(sample(TRACKS[name], 0.96), name).toBe(0);
    }
  });

  it("eases between keyframes like CSS", () => {
    // Halfway through the bubble's fade-in (0 → 6 %), CSS `ease` is ~80 % of the way.
    expect(sample(TRACKS.bubbleOpacity, 0.03)).toBeCloseTo(0.8, 1);
  });
});

describe("REST_AT", () => {
  it("is the final frame: every card in, the time picked, no tap rings", () => {
    expect(sample(TRACKS.bubbleOpacity, REST_AT)).toBe(1);
    expect(sample(TRACKS.timesOpacity, REST_AT)).toBe(1);
    expect(sample(TRACKS.pick, REST_AT)).toBe(1);
    expect(sample(TRACKS.todayOpacity, REST_AT)).toBe(1);
    expect(sample(TRACKS.dropOpacity, REST_AT)).toBe(1);
    expect(sample(TRACKS.dropScale, REST_AT)).toBe(1);
    expect(sample(TRACKS.dropY, REST_AT)).toBe(0);
    expect(sample(TRACKS.bubbleY, REST_AT)).toBe(0);
    expect(sample(TRACKS.tap1Opacity, REST_AT)).toBe(0);
    expect(sample(TRACKS.tap2Opacity, REST_AT)).toBe(0);
  });
});

describe("EXAMPLES", () => {
  it("cycles hair, nails and barber, as in the HTML", () => {
    expect(EXAMPLES.map((e) => e.who)).toEqual([
      "Silk press · Wanjiru",
      "Gel nails · Akinyi",
      "Fade & beard · Brian",
    ]);
    expect(nextExample(0)).toBe(1);
    expect(nextExample(1)).toBe(2);
    expect(nextExample(2)).toBe(0);
  });
});

describe("welcomeDay", () => {
  it("writes the day like the mockup's Today card", () => {
    expect(welcomeDay(new Date("2026-10-04T09:00:00Z"), "Africa/Nairobi")).toBe("Sun 4 Oct");
  });
});
