import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { getEnv } from "../env";
import { googleErrorOutcome, type GoogleResult } from "./google-auth";
import { getSupabase } from "./supabase";

const CODES = {
  cancelled: statusCodes.SIGN_IN_CANCELLED,
  inProgress: statusCodes.IN_PROGRESS,
  noPlayServices: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
};

let configured = false;

/** Configures Google once; false when this build has no web client ID. */
function configureGoogle(): boolean {
  if (configured) return true;
  const webClientId = getEnv().EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) return false;
  GoogleSignin.configure({ webClientId });
  configured = true;
  return true;
}

/**
 * Google's own account chooser over the app (release 1.0.0 part 2, A), then Supabase signs in with
 * the ID token. The root layout then routes to create your salon or the tabs, as after a code.
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  if (!configureGoogle()) {
    console.warn("Google sign-in: no EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in this build");
    return { outcome: "not-set-up", code: "no-client-id" };
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return { outcome: "cancelled" };
    if (!isSuccessResponse(response)) return { outcome: "error", code: "no-success" };
    return await idTokenToSession(response.data.idToken);
  } catch (error) {
    const outcome = googleErrorOutcome(error, CODES);
    const code = (error as { code?: unknown } | null)?.code;
    if (outcome !== "cancelled") console.warn("Google sign-in failed:", code, String(error));
    return { outcome, code: code === undefined ? undefined : String(code) };
  }
}

/** Google's ID token becomes a Supabase session (Supabase creates the user the first time). */
export async function idTokenToSession(idToken: string | null): Promise<GoogleResult> {
  if (!idToken) {
    console.warn("Google sign-in: no ID token (is the web client ID right?)");
    return { outcome: "error", code: "no-id-token" };
  }
  const { error } = await getSupabase().auth.signInWithIdToken({ provider: "google", token: idToken });
  if (error) {
    console.warn("Google sign-in: Supabase refused the token:", error.message);
    return { outcome: "error", code: `supabase: ${error.message}` };
  }
  return { outcome: "signed-in" };
}

/** On Log out and after Delete account, so the next Google sign-in shows the chooser again. */
export async function signOutOfGoogle(): Promise<void> {
  if (!configureGoogle()) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google, or offline: nothing to forget.
  }
}
