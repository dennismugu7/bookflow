/** Bottom sheets close by dragging down (release 1.0.0 part 2, C). */

/** How far down (pt) a drag must go to count as a drag, not a tap or a scroll. */
export const DRAG_START = 8;
/** A flick faster than this (pt/ms) closes the sheet however short it was. */
export const FLICK_SPEED = 1;

/** Whether a move should start dragging the sheet: mostly downward, past the slop. */
export function startsSheetDrag(dx: number, dy: number): boolean {
  return dy > DRAG_START && dy > Math.abs(dx) * 1.5;
}

/** On release: close when dragged a quarter of the sheet (at most 120 pt) or flicked down. */
export function closesSheet(dy: number, vy: number, sheetHeight: number): boolean {
  const threshold = Math.min(120, Math.max(48, sheetHeight * 0.25));
  return dy >= threshold || (vy >= FLICK_SPEED && dy > DRAG_START);
}

/** The sheet follows the finger down, never up past where it rests. */
export function sheetOffset(dy: number): number {
  return Math.max(0, dy);
}
