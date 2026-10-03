/** Form rules and helpers for salon setup. The database checks again; these give instant feedback. */

// Services -----------------------------------------------------------------------------

export const DURATION_CHOICES = [15, 20, 30, 45, 60, 90] as const;

export type ServiceForm = {
  name: string;
  /** Minutes, from a chip or the Custom field. */
  duration: string;
  /** Whole shillings as typed, e.g. "2,500". */
  price: string;
  isBookable: boolean;
};

export type ServiceErrors = Partial<Record<"name" | "duration" | "price", string>>;

/** Reads a whole-shilling amount, allowing "2,500" or "2 500". Null if it isn't one. */
export function parsePriceKes(input: string): number | null {
  const digits = input.replace(/[\s,]/g, "");
  if (!/^\d{1,7}$/.test(digits)) return null;
  return Number(digits);
}

export function parseDuration(input: string): number | null {
  if (!/^\d{1,3}$/.test(input.trim())) return null;
  return Number(input.trim());
}

export function validateService(form: ServiceForm): ServiceErrors {
  const errors: ServiceErrors = {};
  const name = form.name.trim();
  if (name.length === 0) errors.name = "Enter the service name.";
  else if (name.length > 80) errors.name = "Keep the name under 80 characters.";

  const duration = parseDuration(form.duration);
  if (duration === null || duration < 5 || duration > 600) {
    errors.duration = "Use 5 to 600 minutes.";
  } else if (duration % 5 !== 0) {
    errors.duration = "Use steps of 5 minutes.";
  }

  if (parsePriceKes(form.price) === null)
    errors.price = "Enter the price in whole shillings, e.g. 1500.";
  return errors;
}

/** Maps a database error when saving a service to a field message. */
export function serviceSaveError(error: { code?: string; message?: string } | null | undefined): {
  field: keyof ServiceErrors | "form";
  message: string;
} {
  if (error?.code === "23514") {
    if (/duration/i.test(error.message ?? ""))
      return { field: "duration", message: "Use 5 to 600 minutes, in steps of 5." };
    if (/price/i.test(error.message ?? ""))
      return { field: "price", message: "The price can't be negative." };
    return { field: "form", message: "Check the details and try again." };
  }
  if (error?.code === "23503") {
    return {
      field: "form",
      message:
        "This service has bookings, so it can't be deleted. Turn off “Bookable by clients” instead.",
    };
  }
  return { field: "form", message: "Couldn't save. Check your connection and try again." };
}

/** "45 min", "1h", "1h 30m" for the service preview and lists. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// Team ---------------------------------------------------------------------------------

export type StaffForm = { name: string; title: string; about: string; serviceIds: string[] };
export type StaffErrors = Partial<Record<"name" | "title" | "about" | "services", string>>;

export function validateStaff(form: StaffForm): StaffErrors {
  const errors: StaffErrors = {};
  const name = form.name.trim();
  if (name.length === 0) errors.name = "Enter their name.";
  else if (name.length > 60) errors.name = "Keep the name under 60 characters.";
  if (form.title.trim().length > 40) errors.title = "Keep the title under 40 characters.";
  if (form.about.trim().length > 300) errors.about = "Keep this under 300 characters.";
  if (form.serviceIds.length === 0)
    errors.services = "Pick at least one service so clients can book them.";
  return errors;
}

/** Which staff_services rows to insert and delete to go from `current` to `next`. */
export function diffIds(current: string[], next: string[]): { add: string[]; remove: string[] } {
  const before = new Set(current);
  const after = new Set(next);
  return {
    add: next.filter((id) => !before.has(id)),
    remove: current.filter((id) => !after.has(id)),
  };
}

// Brand --------------------------------------------------------------------------------

export type BrandForm = { name: string; tagline: string; about: string };
export type BrandErrors = Partial<Record<keyof BrandForm, string>>;

export function validateBrand(form: BrandForm): BrandErrors {
  const errors: BrandErrors = {};
  const name = form.name.trim();
  if (name.length === 0) errors.name = "Enter your salon's name.";
  else if (name.length > 80) errors.name = "Keep the name under 80 characters.";
  if (form.tagline.trim().length > 80) errors.tagline = "Keep the tagline under 80 characters.";
  if (form.about.trim().length > 600) errors.about = "Keep this under 600 characters.";
  return errors;
}

// Images -------------------------------------------------------------------------------

export type MediaKind = "logo" | "banner" | "staff";

/** Longest edge for logos and staff photos; banners are limited by width. */
export const IMAGE_LIMITS: Record<MediaKind, { max: number; edge: "longest" | "width" }> = {
  logo: { max: 512, edge: "longest" },
  staff: { max: 512, edge: "longest" },
  banner: { max: 1600, edge: "width" },
};

/**
 * The resize to apply before upload, keeping the aspect ratio, or null when the image is
 * already small enough (never upscale).
 */
export function resizeFor(
  kind: MediaKind,
  width: number,
  height: number,
): { width: number } | { height: number } | null {
  const { max, edge } = IMAGE_LIMITS[kind];
  if (edge === "width" || width >= height) return width > max ? { width: max } : null;
  return height > max ? { height: max } : null;
}

/** `<salon_id>/<kind>/<uuid>.jpg`, the path the storage policies expect. */
export function mediaPath(salonId: string, kind: MediaKind | "portfolio", id: string): string {
  return `${salonId}/${kind}/${id}.jpg`;
}

// Opening hours ------------------------------------------------------------------------

export const WEEKDAYS = [
  { day: 1, name: "Monday" },
  { day: 2, name: "Tuesday" },
  { day: 3, name: "Wednesday" },
  { day: 4, name: "Thursday" },
  { day: 5, name: "Friday" },
  { day: 6, name: "Saturday" },
  { day: 7, name: "Sunday" },
] as const;

export type Range = { opens: string; closes: string };
/** weekday (1 = Monday) → ranges; an empty list means Closed. */
export type Week = Record<number, Range[]>;

/**
 * Tidies a typed time into "HH:MM": "9" → "09:00", "930" → "09:30", "9.30" → "09:30".
 * Returns null for anything that isn't a time; "24:00" is allowed (midnight close).
 */
export function normalizeTime(input: string): string | null {
  const text = input.trim().replace(/[.h]/i, ":");
  let hours: number;
  let minutes: number;
  const withColon = /^(\d{1,2}):(\d{2})$/.exec(text);
  const digitsOnly = /^(\d{1,4})$/.exec(text);
  if (withColon) {
    hours = Number(withColon[1]);
    minutes = Number(withColon[2]);
  } else if (digitsOnly) {
    const digits = digitsOnly[1]!;
    if (digits.length <= 2) {
      hours = Number(digits);
      minutes = 0;
    } else {
      hours = Number(digits.slice(0, -2));
      minutes = Number(digits.slice(-2));
    }
  } else {
    return null;
  }
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes !== 0)) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Per-day error messages; empty when the week can be saved. */
export function validateWeek(week: Week): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const { day } of WEEKDAYS) {
    const ranges = week[day] ?? [];
    const parsed = ranges.map((r) => ({
      opens: normalizeTime(r.opens),
      closes: normalizeTime(r.closes),
    }));
    if (parsed.some((r) => r.opens === null || r.closes === null)) {
      errors[day] = "Use times like 09:00 or 18:30.";
      continue;
    }
    const valid = parsed as Range[];
    if (valid.some((r) => r.opens === "24:00")) {
      errors[day] = "24:00 can only be a closing time.";
      continue;
    }
    if (valid.some((r) => toMinutes(r.closes) <= toMinutes(r.opens))) {
      errors[day] = "Closing time must be after opening time.";
      continue;
    }
    const sorted = [...valid].sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens));
    if (sorted.some((r, i) => i > 0 && toMinutes(r.opens) < toMinutes(sorted[i - 1]!.closes))) {
      errors[day] = "These times overlap.";
    }
  }
  return errors;
}

/** Rows for set_opening_hours, normalised and in day order. Call after validateWeek. */
export function weekToRows(week: Week): { weekday: number; opens: string; closes: string }[] {
  return WEEKDAYS.flatMap(({ day }) =>
    (week[day] ?? [])
      .map((r) => ({
        weekday: day,
        opens: normalizeTime(r.opens)!,
        closes: normalizeTime(r.closes)!,
      }))
      .sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens)),
  );
}

/** Database rows ("10:00:00") back into the editable week. */
export function rowsToWeek(rows: { weekday: number; opens: string; closes: string }[]): Week {
  const week: Week = Object.fromEntries(WEEKDAYS.map(({ day }) => [day, [] as Range[]]));
  for (const row of [...rows].sort((a, b) => a.opens.localeCompare(b.opens))) {
    week[row.weekday]?.push({ opens: row.opens.slice(0, 5), closes: row.closes.slice(0, 5) });
  }
  return week;
}

/** "10:00 – 18:00", "10:00 – 13:00, 14:00 – 20:00" or "Closed". */
export function describeDay(ranges: Range[]): string {
  if (ranges.length === 0) return "Closed";
  return ranges.map((r) => `${r.opens} – ${r.closes}`).join(", ");
}

// Publishing ---------------------------------------------------------------------------

export type SetupStatus = { services: boolean; team: boolean; hours: boolean };

export function isSetupComplete(status: SetupStatus | null | undefined): boolean {
  return !!status && status.services && status.team && status.hours;
}

/** Message for a failed publish. */
export function publishErrorMessage(error: { code?: string } | null | undefined): string {
  if (error?.code === "BF422")
    return "Finish the checklist first: services, team and opening hours.";
  if (error?.code === "42501") return "Only the salon owner can publish.";
  return "Couldn't publish. Check your connection and try again.";
}
