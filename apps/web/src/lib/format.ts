/** Small display helpers shared by the client pages. */

/** "Mon 5 Oct, 10:45" in the salon's timezone (24-hour, as in the original designs). */
export function formatShortDateTime(iso: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Some ICU versions say "Sept"; the designs use three letters ("Sat 12 Sep").
  const month = get("month").slice(0, 3);
  return `${get("weekday")} ${get("day")} ${month}, ${get("hour")}:${get("minute")}`;
}

/** "10:45" in the salon's timezone. */
export function formatClock(iso: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}`;
}

/** "1 item · 30 mins", "3 items · 2h 15 mins". */
export function cartSummary(count: number, minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time =
    hours === 0 ? `${minutes} mins` : rest === 0 ? `${hours}h` : `${hours}h ${rest} mins`;
  return `${count} ${count === 1 ? "item" : "items"} · ${time}`;
}

/** "Njeri Kamau" → "NK"; "salome" → "S". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** WhatsApp share link that works on phones and desktop, with no number preselected. */
export function whatsappShareUrl(message: string, link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`;
}

/** First name for "Njeri will see this on the day". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
