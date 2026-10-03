import { toSalonSlug } from "@bookflow/shared";

export const SALON_MESSAGES = {
  nameRequired: "Enter your salon's name.",
  nameTooLong: "Keep the name under 80 characters.",
  slugTaken: "That link is taken, try another",
  slugInvalid: "Use letters, numbers and hyphens",
  slugLength: "Use 3 to 40 characters",
  unknown: "Couldn't create your salon. Try again.",
} as const;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Field errors before calling create_salon; the database checks again. */
export function validateSalonForm(name: string, slug: string): { name?: string; slug?: string } {
  const errors: { name?: string; slug?: string } = {};
  const trimmed = name.trim();
  if (trimmed.length === 0) errors.name = SALON_MESSAGES.nameRequired;
  else if (trimmed.length > 80) errors.name = SALON_MESSAGES.nameTooLong;
  if (slug.length < 3 || slug.length > 40) errors.slug = SALON_MESSAGES.slugLength;
  else if (!SLUG.test(slug)) errors.slug = SALON_MESSAGES.slugInvalid;
  return errors;
}

/** Maps a create_salon Postgres error to a field and message. */
export function createSalonErrorMessage(error: { code?: string } | null | undefined): {
  field: "slug" | "form";
  message: string;
} {
  if (error?.code === "23505") return { field: "slug", message: SALON_MESSAGES.slugTaken };
  if (error?.code === "23514") return { field: "slug", message: SALON_MESSAGES.slugInvalid };
  return { field: "form", message: SALON_MESSAGES.unknown };
}

/** Tidies what the owner types into the link field: lower-case, spaces to hyphens. */
export function cleanSlugInput(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "-");
}

/** The slug suggested from the name, or "" when the name is too short to suggest one. */
export function suggestSlug(name: string): string {
  return toSalonSlug(name) ?? "";
}
