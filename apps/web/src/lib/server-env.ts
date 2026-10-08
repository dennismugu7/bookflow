import "server-only";

import { z } from "zod";

/** Cloudflare's documented always-pass test keys, used only outside production. */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

const schema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  REVIEW_PASSWORD: z.string().min(1).optional(),
});

type ServerEnv = z.infer<typeof schema>;

function read(): ServerEnv {
  // Empty strings count as missing. Values are never logged.
  return schema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
    REVIEW_PASSWORD: process.env.REVIEW_PASSWORD || undefined,
  });
}

/** Vercel production only; previews and local development may use the Turnstile test keys. */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function supabaseSecretKey(): string | null {
  return read().SUPABASE_SECRET_KEY ?? null;
}

/** The Turnstile key pair, or null in production when it isn't configured. */
export function turnstileKeys(): { siteKey: string; secretKey: string } | null {
  const env = read();
  if (env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY) {
    return { siteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, secretKey: env.TURNSTILE_SECRET_KEY };
  }
  if (isProduction()) return null;
  return { siteKey: TURNSTILE_TEST_SITE_KEY, secretKey: TURNSTILE_TEST_SECRET_KEY };
}

/** The Google Play reviewer's password (release 1.0.1), or null when unset or under 24 characters. */
export function reviewPassword(): string | null {
  const password = read().REVIEW_PASSWORD;
  return password && password.length >= 24 ? password : null;
}
