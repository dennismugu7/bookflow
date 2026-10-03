import { cookies } from "next/headers";
import { z } from "zod";

import { holdErrorResponse } from "../../../lib/booking-messages";
import { HOLD_COOKIE, HOLD_COOKIE_MAX_AGE, clientIpFrom, newHoldToken } from "../../../lib/holds";
import { isProduction, turnstileKeys } from "../../../lib/server-env";
import { createAdminClient } from "../../../lib/supabase/admin";
import { verifyTurnstile } from "../../../lib/turnstile";

const body = z.object({
  slug: z.string().min(1).max(40),
  serviceIds: z.array(z.uuid()).min(1).max(10),
  startsAt: z.iso.datetime({ offset: true }),
  staffId: z.uuid().nullable(),
  turnstileToken: z.string().min(1).max(2048),
});

const json = (status: number, data: unknown) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Creates a 10-minute hold (ADR 0008): checks Turnstile, takes the visitor's address from
 * Vercel's headers, and calls create_hold with the secret key. The token goes into an
 * httpOnly cookie and is never returned to the page.
 */
export async function POST(request: Request) {
  const keys = turnstileKeys();
  const admin = createAdminClient();
  if (!keys || !admin) {
    console.error(
      `[holds] not configured: ${[!keys && "Turnstile keys", !admin && "SUPABASE_SECRET_KEY"].filter(Boolean).join(", ")}`,
    );
    return json(503, {
      code: "UNAVAILABLE",
      message: "Booking is temporarily unavailable. Try again later.",
    });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return json(400, {
      code: "INVALID",
      message: "Something about this booking changed. Start again.",
    });
  const input = parsed.data;

  const ip = clientIpFrom(request.headers) ?? (isProduction() ? null : "127.0.0.1");
  if (!ip)
    return json(400, { code: "INVALID", message: "We couldn't check your connection. Try again." });

  if (!(await verifyTurnstile(input.turnstileToken, keys.secretKey, ip))) {
    return json(403, {
      code: "BOT_CHECK",
      message: "We couldn't confirm you're not a robot. Try again.",
    });
  }

  const token = newHoldToken();
  const { data, error } = await admin
    .rpc("create_hold", {
      p_salon_slug: input.slug,
      p_service_ids: input.serviceIds,
      p_starts_at: input.startsAt,
      // Typed as non-null by the generator, but null means "any professional".
      p_staff_id: input.staffId as string,
      p_hold_token: token,
      p_client_ip: ip,
    })
    .single();
  if (error || !data) {
    const mapped = holdErrorResponse(error);
    if (mapped.status === 500)
      console.error(`[holds] create_hold failed: ${error?.code ?? "no data"}`);
    return json(mapped.status, { code: mapped.code, message: mapped.message });
  }

  (await cookies()).set(HOLD_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HOLD_COOKIE_MAX_AGE,
  });
  return json(200, { holdId: data.hold_id, staffId: data.staff_id, expiresAt: data.expires_at });
}
