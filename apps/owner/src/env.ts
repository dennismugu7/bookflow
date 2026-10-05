import { z } from "zod";

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Optional: the web app for /api/account/delete, e.g. a local `pnpm dev:web`. Production otherwise.
  EXPO_PUBLIC_WEB_URL: z.url().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated on first use, so a missing key fails fast with its name instead of surfacing later.
 * Keys are read one by one because Expo only inlines literal `process.env.EXPO_PUBLIC_*` accesses.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const result = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL || undefined,
  });
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(
      `Missing or invalid env: ${keys.join(", ")}. Copy apps/owner/.env.example to apps/owner/.env.local and set the values.`,
    );
  }
  cached = result.data;
  return cached;
}
