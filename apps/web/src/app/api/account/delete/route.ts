import { parseDeletionSummary, type Database } from "@bookflow/shared";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getEnv } from "../../../../env";
import {
  MEDIA_BUCKET,
  bearerToken,
  createRateLimit,
  deleteAccount,
  deleteAccountBody,
  listRecursive,
  type DeletionSteps,
} from "../../../../lib/account-deletion";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient as createServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

const json = (status: number, data: unknown) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

const FAILED = {
  code: "FAILED",
  message: "Couldn't delete your account. Check your connection and try again.",
};

// 5 attempts per user per hour, per server instance (the spec allows in-memory).
const allowAttempt = createRateLimit(5, 60 * 60 * 1000);

/**
 * Deletes the caller's account: salon photos, then the rows (delete_account_data), then the
 * auth user. The owner app sends its access token; the web page uses its session cookie.
 */
export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[account] not configured: SUPABASE_SECRET_KEY");
    return json(503, {
      code: "UNAVAILABLE",
      message: "Deleting accounts is unavailable. Try again later.",
    });
  }

  const token = bearerToken(request.headers);
  const env = getEnv();
  const supabase = token
    ? createSupabaseClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        },
      )
    : await createServerClient();
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (!user)
    return json(401, { code: "SIGNED_OUT", message: "Sign in again to delete your account." });

  if (!allowAttempt(user.id))
    return json(429, { code: "TOO_MANY", message: "Too many tries. Wait an hour and try again." });

  const parsed = deleteAccountBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return json(400, {
      code: "INVALID",
      message: "Pick a reason (and keep it under 300 characters).",
    });

  const media = admin.storage.from(MEDIA_BUCKET);
  const steps: DeletionSteps = {
    salonIds: async () => {
      const { data, error } = await supabase.rpc("get_account_deletion_summary");
      const summary = parseDeletionSummary(data);
      if (error || !summary) throw new Error("summary");
      return summary.salons.map((s) => s.id);
    },
    listMedia: (prefix) =>
      listRecursive(prefix, (path, offset) =>
        media.list(path, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
      ),
    removeMedia: async (paths) => {
      const { error } = await media.remove(paths);
      if (error) throw new Error("remove");
    },
    deleteData: async (userId, input) => {
      const { error } = await admin.rpc("delete_account_data", {
        p_user_id: userId,
        p_reason: input.reason,
        // Typed as non-null by the generator; null means no details.
        p_details: (input.details ?? null) as string,
      });
      if (error) throw new Error("data");
    },
    deleteAuthUser: async (userId) => {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error("user");
    },
  };

  const result = await deleteAccount(user.id, parsed.data, steps);
  if (!result.ok) {
    console.error(`[account] deletion failed at ${result.step}`);
    return json(500, FAILED);
  }

  if (!token) {
    // The session belongs to a user who no longer exists: drop Supabase's cookies.
    const store = await cookies();
    for (const cookie of store.getAll()) {
      if (cookie.name.startsWith("sb-")) store.delete(cookie.name);
    }
  }
  return json(200, { deleted: true });
}
