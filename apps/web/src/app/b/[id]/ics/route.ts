import { buildIcs } from "../../../../lib/ics";
import { getMyBooking } from "../../../../lib/my-booking";

/** "Add to calendar": the booking as an .ics file, for its owner only. */
export async function GET(request: Request, ctx: RouteContext<"/b/[id]/ics">) {
  const { id } = await ctx.params;
  const booking = await getMyBooking(id);
  if (!booking) return new Response("Not found", { status: 404 });

  const ics = buildIcs({
    id: booking.id,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    salonName: booking.salon.name,
    services: booking.services.map((s) => s.name),
    staffName: booking.staff_name,
    address: booking.salon.address,
    url: new URL(`/b/${booking.id}`, request.url).toString(),
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookflow-${booking.salon.slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
