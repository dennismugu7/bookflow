/** A short confirmation over every screen (release 1.0.0 part 2, D): "Changes saved". */

export type ToastMessage = { id: number; text: string };

export const CHANGES_SAVED = "Changes saved";
export const BOOKING_SAVED = "Booking saved";

let current: ToastMessage | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

/** Shows `text`; a newer toast replaces one still on screen. */
export function showToast(text: string = CHANGES_SAVED): void {
  current = { id: nextId++, text };
  for (const listener of listeners) listener();
}

export function getToast(): ToastMessage | null {
  return current;
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For components that prefer a hook; the same `showToast`. */
export function useToast(): (text?: string) => void {
  return showToast;
}
