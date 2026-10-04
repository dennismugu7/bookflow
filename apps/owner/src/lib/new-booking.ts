import { bookingErrorKind, normalizeKenyanPhone } from "@bookflow/shared";

import { addDays, addMinutes, isoWeekday, shortDate, zonedParts, zonedTime } from "./time";

/** Rules for New booking (05). The database checks everything again in owner_create_booking. */

export type ServiceOption = { id: string; name: string; duration_min: number; price_kes: number };
export type StaffOption = { id: string; name: string; serviceIds: string[] };
export type HoursRow = { weekday: number; opens: string; closes: string };

/** "Silk press · 30m", as on the chips. */
export function serviceChipLabel(service: ServiceOption): string {
  return `${service.name} · ${service.duration_min}m`;
}

/** Only the staff who offer every selected service. */
export function eligibleStaff(staff: StaffOption[], selected: string[]): StaffOption[] {
  return staff.filter((s) => selected.every((id) => s.serviceIds.includes(id)));
}

export function totals(services: ServiceOption[], selected: string[]) {
  const picked = services.filter((s) => selected.includes(s.id));
  return {
    minutes: picked.reduce((sum, s) => sum + s.duration_min, 0),
    totalKes: picked.reduce((sum, s) => sum + s.price_kes, 0),
  };
}

/** True when the whole booking fits inside one of that day's opening-hours windows. */
export function withinOpeningHours(
  hours: HoursRow[],
  start: Date,
  minutes: number,
  timeZone: string,
): boolean {
  const { date, time } = zonedParts(start, timeZone);
  const end = zonedParts(addMinutes(start, minutes), timeZone);
  if (end.date !== date && end.time !== "00:00") return false;
  const endTime = end.date !== date ? "24:00" : end.time;
  const weekday = isoWeekday(date);
  return hours.some(
    (h) => h.weekday === weekday && h.opens.slice(0, 5) <= time && endTime <= h.closes.slice(0, 5),
  );
}

/** "Sat 3 Oct · 12:00 – 13:15" (05). */
export function whenLabel(start: Date, minutes: number, timeZone: string): string {
  const end = zonedParts(addMinutes(start, minutes), timeZone).time;
  return `${shortDate(start, timeZone)} · ${zonedParts(start, timeZone).time} – ${end}`;
}

/** The days offered in the When picker: today and the next two weeks. */
export function dayOptions(now: Date, timeZone: string, count = 14) {
  const today = zonedParts(now, timeZone).date;
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    return { date, label: shortDate(zonedTime(date, "12:00", timeZone), timeZone) };
  });
}

/** 15-minute steps from 06:00 to 22:00: owners may book outside opening hours. */
export function timeOptions(): string[] {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 15) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

/** The client step: a picked client, or a new name with an optional phone. */
export type ClientChoice =
  | { kind: "existing"; id: string; name: string; phone: string | null }
  | { kind: "new"; name: string; phone: string };

/** Why the form can't be saved yet, or undefined when it can. */
export function newBookingError(input: {
  client: ClientChoice;
  serviceIds: string[];
  staffId: string | undefined;
}): { field: "client" | "phone" | "services" | "staff"; message: string } | undefined {
  const { client } = input;
  if (client.kind === "new") {
    const name = client.name.trim();
    if (name.length === 0) return { field: "client", message: "Pick a client or type a name." };
    if (name.length > 80) return { field: "client", message: "Keep the name under 80 characters." };
    if (client.phone.trim() && !normalizeKenyanPhone(client.phone)) {
      return {
        field: "phone",
        message: "Enter a phone number like 0712 345 678, or leave it empty.",
      };
    }
  }
  if (input.serviceIds.length === 0)
    return { field: "services", message: "Pick at least one service." };
  if (!input.staffId)
    return { field: "staff", message: "No one on your team offers all of these." };
  return undefined;
}

/** A friendly message for an owner_create_booking error. */
export function createBookingErrorMessage(
  error: { code?: string | null; message?: string } | null | undefined,
): string {
  switch (bookingErrorKind(error)) {
    case "slot_unavailable":
      return "That time is taken. Pick another.";
    case "invalid_status_change":
      return "Pick services this team member offers.";
    case "invalid_input":
      return "Check the client's name and phone number.";
    case "not_found":
      return "That client is no longer in your list. Search again.";
    case "not_allowed":
      return "Only the salon owner can add bookings.";
    default:
      return "Couldn't save the booking. Check your connection and try again.";
  }
}

/** A friendly message for an update_booking_status error. */
export function statusErrorMessage(
  error: { code?: string | null; message?: string } | null | undefined,
): string {
  switch (bookingErrorKind(error)) {
    case "invalid_status_change":
      return "This booking has already changed. Pull down to refresh.";
    case "not_found":
      return "This booking is no longer here. Pull down to refresh.";
    case "not_allowed":
      return "Only the salon owner can make this change.";
    default:
      return "Couldn't update the booking. Check your connection and try again.";
  }
}

/**
 * A PostgREST `or` filter for the client search (name or phone, as typed), or null when there's
 * nothing to search. "0712" also finds "+254712…".
 */
export function clientSearchFilter(query: string): string | null {
  const q = query.replace(/[,()%*\\:"]/g, " ").trim();
  if (!q) return null;
  const filters = [`full_name.ilike.*${q}*`];
  const digits = q.replace(/[\s-]/g, "");
  if (/^\+?\d{2,}$/.test(digits)) {
    filters.push(`phone.like.*${digits.replace(/^0/, "")}*`);
  }
  return filters.join(",");
}
