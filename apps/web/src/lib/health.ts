export type HealthBody = {
  status: "ok";
  supabase: "ok" | "error";
  commit: string;
};

export type HealthResult = {
  httpStatus: 200 | 503;
  body: HealthBody;
};

type CheckHealthOptions = {
  supabaseUrl: string | undefined;
  anonKey: string | undefined;
  commitSha: string | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Pings Supabase Auth's health endpoint. The body only ever reports "ok"/"error":
 * keys and upstream error details stay out of the response because this endpoint is public.
 */
export async function checkHealth({
  supabaseUrl,
  anonKey,
  commitSha,
  fetchImpl = fetch,
  timeoutMs = 3000,
}: CheckHealthOptions): Promise<HealthResult> {
  const commit = commitSha ? commitSha.slice(0, 7) : "local";
  const supabase = await pingSupabase(supabaseUrl, anonKey, fetchImpl, timeoutMs);
  return {
    httpStatus: supabase === "ok" ? 200 : 503,
    body: { status: "ok", supabase, commit },
  };
}

async function pingSupabase(
  supabaseUrl: string | undefined,
  anonKey: string | undefined,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<"ok" | "error"> {
  if (!supabaseUrl || !anonKey) return "error";
  try {
    const response = await fetchImpl(new URL("/auth/v1/health", supabaseUrl), {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
