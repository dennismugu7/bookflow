/** Where the back arrow on My bookings goes (Dennis, 2026-10-04). */
export type BackTarget = { kind: "history" } | { kind: "link"; href: string };

/** localStorage key for the slug of the last salon page this browser opened. */
export const LAST_SALON_KEY = "bookflow:last-salon";

const SLUG = /^[a-z0-9-]+$/;

/**
 * Back to the previous page when it's one of ours (not the sign-in callback or this same page);
 * otherwise to the last salon visited, or the home page if there's none.
 */
export function backTarget({
  previousUrl,
  currentUrl,
  lastSalon,
}: {
  previousUrl: string | null;
  currentUrl: string;
  lastSalon: string | null;
}): BackTarget {
  if (previousUrl) {
    try {
      const previous = new URL(previousUrl);
      const current = new URL(currentUrl);
      if (
        previous.origin === current.origin &&
        previous.pathname !== current.pathname &&
        !previous.pathname.startsWith("/auth/")
      )
        return { kind: "history" };
    } catch {
      // Not a URL: fall through to the salon.
    }
  }
  return { kind: "link", href: lastSalon && SLUG.test(lastSalon) ? `/s/${lastSalon}` : "/" };
}
