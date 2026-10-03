/** Public base URL of the client booking web app. */
export const WEB_BASE_URL = "https://bookflow-web-pearl.vercel.app";

/** The link a salon shares so clients can book, e.g. https://…/s/salome-salon. */
export function bookingLink(slug: string): string {
  return `${WEB_BASE_URL}/s/${slug}`;
}
