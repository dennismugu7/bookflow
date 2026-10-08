import { createHash, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "../../../lib/supabase/admin";
import { reviewPassword } from "../../../lib/server-env";

export const runtime = "nodejs";

/** Google Play's reviewer account (release 1.0.1). No other email can sign in here. */
const REVIEW_EMAIL = "support@mugu-labs.com";

const json = (status: number, data: unknown) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

const UNAVAILABLE = { code: "UNAVAILABLE", message: "Signing in is unavailable. Try again later." };
const WRONG = { code: "WRONG", message: "That password isn't right. Try again." };
const TOO_MANY = { code: "TOO_MANY", message: "Too many tries. Wait 15 minutes and try again." };
const FAILED = { code: "FAILED", message: "Something went wrong. Try again." };

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

function passwordMatches(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * The reviewer login: checks the password against REVIEW_PASSWORD, makes sure the review user
 * and its demo salon exist, and answers with a magic-link token hash (no email is sent). The
 * app exchanges it with verifyOtp. Failed tries are counted in the database, so the limit holds
 * across server instances. Neither the password nor the token is ever logged.
 */
export async function POST(request: Request) {
  const review = reviewPassword();
  if ("problem" in review) {
    console.error(
      review.problem === "missing"
        ? "[review] not configured: REVIEW_PASSWORD missing"
        : "[review] not configured: REVIEW_PASSWORD under 24 characters",
    );
    return json(503, UNAVAILABLE);
  }
  const expected = review.password;
  const admin = createAdminClient();
  if (!admin) {
    console.error("[review] not configured: SUPABASE_SECRET_KEY missing");
    return json(503, UNAVAILABLE);
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const { data: blocked, error: gateError } = await admin.rpc("review_sign_in_blocked");
  if (gateError) {
    console.error("[review] rate limit check failed");
    return json(500, FAILED);
  }
  if (blocked) return json(429, TOO_MANY);

  // Both checks always run, so a wrong email takes as long as a wrong password.
  const emailOk = email === REVIEW_EMAIL;
  const passwordOk = passwordMatches(password, expected);
  if (!emailOk || !passwordOk) {
    const { error } = await admin.rpc("record_review_sign_in_failure");
    if (error) console.error("[review] could not record a failed try");
    return json(401, WRONG);
  }

  try {
    const userId = await ensureReviewUser(admin);
    const { error: demoError } = await admin.rpc("ensure_review_demo", { p_owner: userId });
    if (demoError) throw new Error("demo");

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: REVIEW_EMAIL,
    });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) throw new Error("link");
    return json(200, { token_hash: tokenHash });
  } catch (error) {
    console.error(`[review] sign-in failed at ${error instanceof Error ? error.message : "?"}`);
    return json(500, FAILED);
  }
}

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** The review user's id, created (email confirmed) when missing, e.g. after an account deletion. */
async function ensureReviewUser(admin: Admin): Promise<string> {
  const lookup = async () => {
    const { data, error } = await admin.rpc("get_review_user_id");
    if (error) throw new Error("user lookup");
    return typeof data === "string" ? data : null;
  };
  const existing = await lookup();
  if (existing) return existing;

  const { data, error } = await admin.auth.admin.createUser({
    email: REVIEW_EMAIL,
    email_confirm: true,
  });
  if (data?.user?.id) return data.user.id;
  // Two sign-ins at once: the other one created the user first.
  const raced = error ? await lookup() : null;
  if (raced) return raced;
  throw new Error("user create");
}
