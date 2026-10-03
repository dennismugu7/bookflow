import type { Database } from "@bookflow/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

import { getEnv } from "../env";
import { createChunkedStorage } from "./chunked-storage";

let client: SupabaseClient<Database> | undefined;

/**
 * Created on first use rather than at import, so a build without the Supabase values shows the
 * root layout's configuration message instead of crashing on launch.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const env = getEnv();
  client = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      storage: createChunkedStorage(SecureStore),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  const auth = client.auth;
  // Refresh tokens only while the app is in the foreground. Registered once, with the client.
  AppState.addEventListener("change", (state) => {
    if (state === "active") void auth.startAutoRefresh();
    else void auth.stopAutoRefresh();
  });
  return client;
}
