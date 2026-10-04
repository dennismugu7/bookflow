import type { Href } from "expo-router";

/** Links between owner screens, with their search params. */

export const clientHref = (id: string): Href => ({ pathname: "/clients/[id]", params: { id } });

/**
 * New booking (owner-v3 05). `from` picks the hint under When: "gap" for a free slot or a tap on
 * the calendar, "add" for the + buttons.
 */
export function newBookingHref(options: {
  start?: Date;
  from: "gap" | "add";
  staffId?: string;
  clientId?: string;
}): Href {
  const params: Record<string, string> = { from: options.from };
  if (options.start) params.start = options.start.toISOString();
  if (options.staffId) params.staff = options.staffId;
  if (options.clientId) params.client = options.clientId;
  return { pathname: "/booking/new", params };
}
