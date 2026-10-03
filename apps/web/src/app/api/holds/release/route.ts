import { cookies } from "next/headers";

import { HOLD_COOKIE } from "../../../../lib/holds";
import { createAdminClient } from "../../../../lib/supabase/admin";

/** Releases the visitor's current hold (if any) and clears the cookie. */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(HOLD_COOKIE)?.value;
  if (token) {
    const admin = createAdminClient();
    // BF404 (already gone or expired) is fine; anything else only means the hold lapses by itself.
    const result = admin ? await admin.rpc("release_hold", { p_hold_token: token }) : null;
    if (result?.error && result.error.code !== "BF404") {
      console.error(`[holds] release_hold failed: ${result.error.code}`);
    }
  }
  cookieStore.delete(HOLD_COOKIE);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
