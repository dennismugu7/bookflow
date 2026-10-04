// The in-app splash (01) follows the system splash and stays up until fonts and the session are
// ready, for at least MIN_SPLASH_MS so it never just flickers, then fades into the first screen.

export const MIN_SPLASH_MS = 600;
export const SPLASH_FADE_MS = 300;

/** How much longer the splash must stay up once the app is ready; 0 when it can fade now. */
export function splashHoldMs(shownAt: number, now: number): number {
  return Math.max(0, MIN_SPLASH_MS - (now - shownAt));
}
