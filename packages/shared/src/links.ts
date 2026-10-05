/** Public base URL of the client booking web app. */
export const WEB_BASE_URL = "https://bookflow-web-pearl.vercel.app";

/** The link a salon shares so clients can book, e.g. https://…/s/salome-salon. */
export function bookingLink(slug: string): string {
  return `${WEB_BASE_URL}/s/${slug}`;
}

/** The legal pages and the account deletion page (release prep 1). */
export const PRIVACY_URL = `${WEB_BASE_URL}/privacy`;
export const TERMS_URL = `${WEB_BASE_URL}/terms`;
export const DELETE_ACCOUNT_URL = `${WEB_BASE_URL}/delete-account`;
