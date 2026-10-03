import type { Database } from "@bookflow/shared";
import { createBrowserClient } from "@supabase/ssr";

import { getEnv } from "../../env";

/** Supabase client for Client Components. */
export function createClient() {
  const env = getEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
