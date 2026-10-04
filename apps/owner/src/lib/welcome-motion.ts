// The welcome animation's timeline (docs/design/owner-v2/10-welcome-animation.html), as data for
// React Native's Animated: one progress value runs 0 → 1 every LOOP_MS and each track maps it.

export const LOOP_MS = 6000;

/** Point of the loop shown, still, when the phone's "Remove animations" is on. */
export const REST_AT = 0.8;

/** The three examples each loop cycles through, as in the HTML. */
export const EXAMPLES = [
  { services: "Silk press, braids & more", time: "10:30", who: "Silk press · Wanjiru" },
  { services: "Nails, lashes & brows", time: "11:00", who: "Gel nails · Akinyi" },
  { services: "Fades, beard & trims", time: "9:30", who: "Fade & beard · Brian" },
] as const;

export function nextExample(index: number): number {
  return (index + 1) % EXAMPLES.length;
}

/** "Sat 4 Oct", as on the Today card in the animation. */
export function welcomeDay(date: Date = new Date(), timeZone?: string): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(date);
  return `${part({ weekday: "short" })} ${part({ day: "numeric" })} ${part({ month: "short" })}`;
}

/** CSS's default `ease`, cubic-bezier(0.25, 0.1, 0.25, 1), at x in [0, 1]. */
export function cssEase(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bezier = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  // x(t) is increasing, so bisection finds t.
  let low = 0;
  let high = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (bezier(mid, 0.25, 0.25) < x) low = mid;
    else high = mid;
  }
  return bezier((low + high) / 2, 0.1, 1);
}

export type Track = { inputRange: number[]; outputRange: number[] };

// Animated's native driver ignores an interpolation's easing, so each keyframe segment is
// pre-sampled along the CSS curve.
const STEPS = 8;

/** Keyframes as [percent, value] pairs, eased per segment like a CSS animation. */
function track(keyframes: [number, number][]): Track {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  keyframes.forEach(([percent, value], i) => {
    const next = keyframes[i + 1];
    if (!next || next[1] === value) {
      inputRange.push(percent / 100);
      outputRange.push(value);
      return;
    }
    for (let step = 0; step < STEPS; step++) {
      inputRange.push((percent + ((next[0] - percent) * step) / STEPS) / 100);
      outputRange.push(value + (next[1] - value) * cssEase(step / STEPS));
    }
  });
  return { inputRange, outputRange };
}

/** Fade in and rise 16 px, hold, then fade out upwards by 96 %. */
function beat(start: number, end: number) {
  const opacity = [
    [0, 0],
    [start, 0],
    [end, 1],
    [88, 1],
    [96, 0],
    [100, 0],
  ] as [number, number][];
  const y = [
    [0, 16],
    [start, 16],
    [end, 0],
    [88, 0],
    [96, -8],
    [100, -8],
  ] as [number, number][];
  return {
    opacity: track(start === 0 ? opacity.slice(1) : opacity),
    y: track(start === 0 ? y.slice(1) : y),
  };
}

/** A tap ring: appears at `peak` % and grows out until `end` %. */
function tap(start: number, peak: number, end: number) {
  return {
    opacity: track([
      [0, 0],
      [start, 0],
      [peak, 1],
      [end, 0],
      [100, 0],
    ]),
    scale: track([
      [0, 0.4],
      [start, 0.4],
      [peak, 0.8],
      [end, 1.6],
      [100, 1.6],
    ]),
  };
}

const bubble = beat(0, 6);
const times = beat(28, 36);
const today = beat(55, 62);
const tap1 = tap(14, 18, 26);
const tap2 = tap(44, 48, 56);

export const TRACKS = {
  bubbleOpacity: bubble.opacity,
  bubbleY: bubble.y,
  tap1Opacity: tap1.opacity,
  tap1Scale: tap1.scale,
  timesOpacity: times.opacity,
  timesY: times.y,
  tap2Opacity: tap2.opacity,
  tap2Scale: tap2.scale,
  // The middle chip's purple fill and white text fade in together.
  pick: track([
    [0, 0],
    [47, 0],
    [52, 1],
    [100, 1],
  ]),
  todayOpacity: today.opacity,
  todayY: today.y,
  // The new booking drops in with a small pop; after 88 % it returns to its starting style.
  dropOpacity: track([
    [0, 0],
    [66, 0],
    [72, 1],
    [88, 1],
    [96, 0],
    [100, 0],
  ]),
  dropY: track([
    [0, -14],
    [66, -14],
    [72, 2],
    [76, 0],
    [88, 0],
    [100, -14],
  ]),
  dropScale: track([
    [0, 0.96],
    [66, 0.96],
    [72, 1.02],
    [76, 1],
    [88, 1],
    [100, 0.96],
  ]),
} satisfies Record<string, Track>;

/** A track's value at progress t, as Animated's linear interpolation computes it. */
export function sample({ inputRange, outputRange }: Track, t: number): number {
  if (t <= inputRange[0]!) return outputRange[0]!;
  for (let i = 1; i < inputRange.length; i++) {
    const end = inputRange[i]!;
    if (t <= end) {
      const start = inputRange[i - 1]!;
      const from = outputRange[i - 1]!;
      const to = outputRange[i]!;
      return from + ((to - from) * (t - start)) / (end - start);
    }
  }
  return outputRange.at(-1)!;
}
