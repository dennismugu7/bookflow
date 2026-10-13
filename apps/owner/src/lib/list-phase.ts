// What a list screen shows while its data loads (QA report 8663, M-01;
// docs/specs/qa-8663-loading-and-preview.md): a placeholder until the first answer, never an empty
// state or a blank body.

export type ListPhase = "loading" | "error" | "empty" | "ready";

/**
 * An error wins, with or without data (a failed load shows the reason and Try again, never an
 * empty state). No data yet is loading; only then is `isEmpty` asked.
 */
export function listPhase<T>(
  data: T | undefined,
  error: string | undefined,
  isEmpty: (data: T) => boolean,
): ListPhase {
  if (error) return "error";
  if (data === undefined) return "loading";
  return isEmpty(data) ? "empty" : "ready";
}

/** A fast load shows no placeholder at all. */
export const SKELETON_DELAY_MS = 200;

/** The placeholder shows only while loading, once SKELETON_DELAY_MS have passed. */
export function skeletonVisible(phase: ListPhase, elapsedMs: number): boolean {
  return phase === "loading" && elapsedMs >= SKELETON_DELAY_MS;
}
