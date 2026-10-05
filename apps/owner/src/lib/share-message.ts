import { defaultShareMessage } from "@bookflow/shared";

/** The message the sheet starts with: the saved one, else the default. */
export function initialShareMessage(saved: string | null | undefined, salonName: string): string {
  return saved?.trim() || defaultShareMessage(salonName);
}

/** What to store for the typed message: null when it is blank or the default. */
export function shareMessageToStore(message: string, salonName: string): string | null {
  const trimmed = message.trim();
  return trimmed === "" || trimmed === defaultShareMessage(salonName) ? null : trimmed;
}
