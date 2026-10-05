import * as WebBrowser from "expo-web-browser";
import { useEffect, useSyncExternalStore } from "react";
import { Linking } from "react-native";

import { GOOGLE_REDIRECT, isGoogleCallback, readGoogleResult } from "./google-auth";
import { createGoogleCallback, type GoogleCallbackState } from "./google-callback";
import { getSupabase } from "./supabase";

/** The one place a Google code becomes a session (see google-callback.ts). */
export const googleCallback = createGoogleCallback((code) =>
  getSupabase().auth.exchangeCodeForSession(code),
);

/**
 * Google through Supabase (PKCE) in the system browser. Resolves "signed-in" (the root layout then
 * routes to onboarding or the tabs, as after a code), "cancelled" (stay silently) or "error".
 */
export async function signInWithGoogle(): Promise<"signed-in" | "cancelled" | "error"> {
  try {
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: GOOGLE_REDIRECT,
        skipBrowserRedirect: true,
        // Always show Google's account chooser, so a phone with one signed-in account can still
        // pick another (or add one) instead of being signed straight in.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) return "error";
    const browser = await WebBrowser.openAuthSessionAsync(data.url, GOOGLE_REDIRECT);
    const result = readGoogleResult(browser);
    if (result.kind === "cancel") return "cancelled";
    if (browser.type !== "success") return "error";
    return await googleCallback.complete(browser.url);
  } catch {
    return "error";
  }
}

/**
 * Root layout: also completes the callback when it reaches the app only as a link, e.g. after
 * Android killed the app while the user was in Chrome (then openAuthSessionAsync is gone).
 */
export function useGoogleCallbackLinks(): GoogleCallbackState {
  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (isGoogleCallback(url)) void googleCallback.complete(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (isGoogleCallback(url)) void googleCallback.complete(url);
    });
    return () => subscription.remove();
  }, []);
  return useSyncExternalStore(googleCallback.subscribe, googleCallback.getState);
}
