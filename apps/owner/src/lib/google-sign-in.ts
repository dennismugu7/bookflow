import * as WebBrowser from "expo-web-browser";

import { GOOGLE_REDIRECT, readGoogleResult } from "./google-auth";
import { getSupabase } from "./supabase";

/**
 * Google through Supabase (PKCE) in the system browser. Resolves "signed-in" (the root layout then
 * routes to onboarding or the tabs, as after a code), "cancelled" (stay silently) or "error".
 */
export async function signInWithGoogle(): Promise<"signed-in" | "cancelled" | "error"> {
  try {
    const auth = getSupabase().auth;
    const { data, error } = await auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: GOOGLE_REDIRECT, skipBrowserRedirect: true },
    });
    if (error || !data.url) return "error";
    const result = readGoogleResult(
      await WebBrowser.openAuthSessionAsync(data.url, GOOGLE_REDIRECT),
    );
    if (result.kind === "cancel") return "cancelled";
    if (result.kind === "error") return "error";
    const { error: exchangeError } = await auth.exchangeCodeForSession(result.code);
    return exchangeError ? "error" : "signed-in";
  } catch {
    return "error";
  }
}
