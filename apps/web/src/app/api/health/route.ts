import { getEnv } from "../../../env";
import { checkHealth } from "../../../lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const { httpStatus, body } = await checkHealth({
    ...readSupabaseConfig(),
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  return Response.json(body, {
    status: httpStatus,
    headers: { "Cache-Control": "no-store" },
  });
}

// A missing or invalid env reports as supabase "error" instead of a 500 with details.
function readSupabaseConfig() {
  try {
    const env = getEnv();
    return { supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  } catch {
    return { supabaseUrl: undefined, anonKey: undefined };
  }
}
