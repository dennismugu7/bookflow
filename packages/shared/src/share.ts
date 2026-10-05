/** Longest share message an owner can save (matches the database check). */
export const SHARE_MESSAGE_MAX = 200;

/** The message used when the owner hasn't written their own. */
export function defaultShareMessage(name: string): string {
  return `Book your next visit at ${name}. It takes less than a minute 👇`;
}

/** What the share sheet sends: the owner's message (or the default), then the link on its own line. */
export function shareText(
  message: string | null | undefined,
  link: string,
  salonName: string,
): string {
  const text = message?.trim() || defaultShareMessage(salonName);
  return `${text}\n${link}`;
}
