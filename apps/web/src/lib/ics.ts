export type IcsBooking = {
  id: string;
  startsAt: string;
  endsAt: string;
  salonName: string;
  services: string[];
  staffName: string;
  address: string | null;
  url: string;
};

/** iCalendar UTC timestamp: 20261010T073000Z. */
function icsTime(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escapes text per RFC 5545 (backslash, semicolon, comma, newline). */
function icsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

/** A single-event calendar file for "Add to calendar". */
export function buildIcs(booking: IcsBooking, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bookflow//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@bookflow`,
    `DTSTAMP:${icsTime(now.toISOString())}`,
    `DTSTART:${icsTime(booking.startsAt)}`,
    `DTEND:${icsTime(booking.endsAt)}`,
    `SUMMARY:${icsText(`${booking.services.join(", ")} at ${booking.salonName}`)}`,
    `DESCRIPTION:${icsText(`With ${booking.staffName}. Pay at the salon.\n${booking.url}`)}`,
    ...(booking.address ? [`LOCATION:${icsText(booking.address)}`] : []),
    `URL:${booking.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
