import "server-only";

import type { Database } from "@bookflow/shared";
import { createClient } from "@supabase/supabase-js";

import { getEnv } from "../../env";
import { supabaseSecretKey } from "../server-env";

/**
 * Supabase client with the secret key. Server only, and used only for create_hold and
 * release_hold (ADR 0008), for deleting an account (/api/account/delete) and for the Google Play
 * reviewer login (/api/review-sign-in). Returns null when the key isn't configured.
 */
export function createAdminClient() {
  const key = supabaseSecretKey();
  if (!key) return null;
  return createClient<Database>(getEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
