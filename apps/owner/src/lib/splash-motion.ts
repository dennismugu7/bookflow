// The animated splash's timeline (docs/specs/splash-animation.md, motion from
// docs/design/brand/splash-animation.html), as data for React Native's Animated: one progress value
// runs in milliseconds from 0 to END_MS and each track maps it. Like welcome-motion, every keyframe
// segment is pre-sampled along its CSS curve, because the native driver ignores an interpolation's
// easing.

import type { Track } from "./welcome-motion";

/** The heartbeat ends here; the exit may start once the app is ready too. */
export const INTRO_MS = 2350;
/** The halo settles here (0.18 opacity, scale 1.15): the frame held while the app loads. */
export const END_MS = 2600;
/** The cross-fade from the splash to the first screen. */
export const EXIT_MS = 300;
/** "Remove animations" on: the logo and halo only fade in, over this long. */
export const REDUCED_MS = 400;

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of x in [0, 1]. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bezier = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // x(t) is increasing when x1 and x2 are in [0, 1], so bisection finds t.
    let low = 0;
    let high = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      if (bezier(mid, x1, x2) < x) low = mid;
      else high = mid;
    }
    return bezier((low + high) / 2, y1, y2);
  };
}

const easeOut = cubicBezier(0, 0, 0.58, 1);
const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
const settle = cubicBezier(0.2, 0.8, 0.2, 1);
const overshoot = cubicBezier(0.34, 1.56, 0.64, 1);

// Enough samples to keep the overshoot's peak.
const STEPS = 24;

/**
 * Keyframes as [ms, value] pairs, each segment eased like a CSS animation. Opacity is clamped to
 * [0, 1], as CSS does when an overshoot curve carries it past 1.
 */
function track(keyframes: [number, number][], ease: (x: number) => number, clamp = false): Track {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  keyframes.forEach(([ms, value], i) => {
    const next = keyframes[i + 1];
    if (!next || next[1] === value) {
      inputRange.push(ms);
      outputRange.push(value);
      return;
    }
    for (let step = 0; step < STEPS; step++) {
      inputRange.push(ms + ((next[0] - ms) * step) / STEPS);
      const eased = value + (next[1] - value) * ease(step / STEPS);
      outputRange.push(clamp ? Math.min(1, Math.max(0, eased)) : eased);
    }
  });
  return { inputRange, outputRange };
}

/** An element that eases from `from` to `to` between `start` and `start + duration` ms. */
function move(start: number, duration: number, from: number, to: number, ease = settle, clamp = false) {
  return track(
    [
      [start, from],
      [start + duration, to],
    ],
    ease,
    clamp,
  );
}

const fadeIn = (start: number, duration: number, ease: (x: number) => number) =>
  move(start, duration, 0, 1, ease, true);

export const TRACKS = {
  haloOpacity: track(
    [
      [0, 0],
      [1560, 0.35],
      [END_MS, 0.18],
    ],
    easeOut,
    true,
  ),
  haloScale: track(
    [
      [0, 0.4],
      [1560, 1],
      [END_MS, 1.15],
    ],
    easeOut,
  ),
  stemOpacity: fadeIn(250, 550, settle),
  stemScaleY: move(250, 550, 0, 1, settle),
  topOpacity: fadeIn(650, 600, overshoot),
  topScaleX: move(650, 600, 0, 1, overshoot),
  botOpacity: fadeIn(1000, 700, overshoot),
  /** Degrees. */
  botRotate: move(1000, 700, -35, 0, overshoot),
  botScale: move(1000, 700, 0.6, 1, overshoot),
  markScale: track(
    [
      [1750, 1],
      [1750 + 0.45 * 600, 1.06],
      [INTRO_MS, 1],
    ],
    easeInOut,
  ),
} satisfies Record<string, Track>;

export const REDUCED_TRACKS = {
  haloOpacity: move(0, REDUCED_MS, 0, 0.18, easeOut, true),
  logoOpacity: fadeIn(0, REDUCED_MS, easeOut),
} satisfies Record<string, Track>;

/** Ready early: finish through the heartbeat. Still loading: hold the final frame. */
export function readyToExit({ introDone, appReady }: { introDone: boolean; appReady: boolean }) {
  return introDone && appReady;
}

/** The spec's colours. `background` is also the native splash's colour in app.json. */
export const SPLASH_COLORS = {
  background: "#2B2183",
  halo: "#3D2FA8",
  pale: "#E8FBF8",
  mint: "#A6F2E8",
} as const;

/** The logo's box in the 1024 × 1024 artwork (stem's left edge to the lower bowl's right). */
export const LOGO = { x: 343, y: 278, width: 339, height: 467 } as const;

/** Screen points per artwork unit: the logo is 38 % of the screen's shorter side. */
export function logoUnit(width: number, height: number): number {
  return (0.38 * Math.min(width, height)) / LOGO.width;
}
