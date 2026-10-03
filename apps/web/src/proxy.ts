import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "./env";

/**
 * Refreshes the client's Supabase session on each request so Server Components, Server Actions
 * and route handlers see a valid session. Every action still checks the user itself.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Pages, actions and auth routes; not static files, images or the health check.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
