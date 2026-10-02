import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated on first use, so a missing key fails fast with its name instead of surfacing later.
 * Keys are read one by one because Next only inlines literal `process.env.NEXT_PUBLIC_*` accesses.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const result = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(
      `Missing or invalid env: ${keys.join(", ")}. Copy apps/web/.env.example to apps/web/.env.local and set the values.`,
    );
  }
  cached = result.data;
  return cached;
}
