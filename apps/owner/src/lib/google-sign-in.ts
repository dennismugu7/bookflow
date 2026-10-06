import GoogleCredential from "../../modules/google-credential";
import { getEnv } from "../env";
import { googleErrorOutcome, type GoogleResult } from "./google-auth";
import { getSupabase } from "./supabase";

/**
 * Sign in with Google through Android Credential Manager (release 1.0.0 part 4): Google's chooser
 * and, the first time, its consent, then Supabase signs in with the ID token and the raw nonce.
 * `onToken` fires when Google has answered and Bookflow starts signing in ("Signing you in…").
 */
export async function signInWithGoogle(onToken?: () => void): Promise<GoogleResult> {
  const serverClientId = getEnv().EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!serverClientId) {
    console.warn("Google sign-in: no EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in this build");
    return { outcome: "not-set-up", code: "no-client-id" };
  }
  let idToken: string;
  // Google signs the hash into the token; Supabase checks it against the raw value.
  const nonce = GoogleCredential.createNonce();
  try {
    ({ idToken } = await GoogleCredential.signIn(serverClientId, nonce.hashed));
  } catch (error) {
    const outcome = googleErrorOutcome(error);
    const code = (error as { code?: unknown } | null)?.code;
    if (outcome !== "cancelled") console.warn("Google sign-in failed:", code, String(error));
    return { outcome, code: code === undefined ? undefined : String(code) };
  }
  onToken?.();
  return idTokenToSession(idToken, nonce.raw);
}

/** Google's ID token becomes a Supabase session (Supabase creates the user the first time). */
export async function idTokenToSession(idToken: string | null, nonce: string): Promise<GoogleResult> {
  if (!idToken) {
    console.warn("Google sign-in: no ID token");
    return { outcome: "error", code: "no-id-token" };
  }
  const { error } = await getSupabase().auth.signInWithIdToken({
    provider: "google",
    token: idToken,
    nonce,
  });
  if (error) {
    console.warn("Google sign-in: Supabase refused the token:", error.message);
    return { outcome: "error", code: `supabase: ${error.message}` };
  }
  return { outcome: "signed-in" };
}

/** On Log out and after Delete account, so the next Google sign-in shows the chooser again. */
export async function signOutOfGoogle(): Promise<void> {
  try {
    await GoogleCredential.clearCredentialState();
  } catch {
    // Nothing stored, or no Play Services: nothing to forget.
  }
}
