const MAX_SLUG_LENGTH = 40;
const MIN_SLUG_LENGTH = 3;

/**
 * Suggests a booking-link slug from a salon name: "Njeri's Beauty & Spa" → "njeris-beauty-spa".
 * Returns null when too little is left (under 3 characters). The output always satisfies the
 * database check `^[a-z0-9]+(-[a-z0-9]+)*$`, which stays the authority.
 */
export function toSalonSlug(name: string): string | null {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’‘`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
  return slug.length >= MIN_SLUG_LENGTH ? slug : null;
}
