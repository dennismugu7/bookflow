import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { getEnv } from "../env";
import { googleErrorOutcome, type GoogleOutcome } from "./google-auth";
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
export async function signInWithGoogle(): Promise<GoogleOutcome> {
  if (!configureGoogle()) {
    console.warn("Google sign-in: no EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in this build");
    return "not-set-up";
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return "cancelled";
    if (!isSuccessResponse(response)) return "error";
    return await idTokenToSession(response.data.idToken);
  } catch (error) {
    const outcome = googleErrorOutcome(error, CODES);
    if (outcome !== "cancelled") {
      console.warn("Google sign-in failed:", (error as { code?: unknown })?.code, String(error));
    }
    return outcome;
  }
}

/** Google's ID token becomes a Supabase session (Supabase creates the user the first time). */
export async function idTokenToSession(idToken: string | null): Promise<GoogleOutcome> {
  if (!idToken) {
    console.warn("Google sign-in: no ID token (is the web client ID right?)");
    return "error";
  }
  const { error } = await getSupabase().auth.signInWithIdToken({ provider: "google", token: idToken });
  if (error) {
    console.warn("Google sign-in: Supabase refused the token:", error.message);
    return "error";
  }
  return "signed-in";
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
