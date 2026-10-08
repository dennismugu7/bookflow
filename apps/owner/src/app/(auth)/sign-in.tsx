import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { debugApkLabel } from "../../build-info";
import { getEnv } from "../../env";
import { webUrl } from "../../lib/account-deletion";
import { AUTH_MESSAGES, isValidEmail, sendCodeErrorMessage } from "../../lib/auth-errors";
import { googleMessage } from "../../lib/google-auth";
import { signInWithGoogle } from "../../lib/google-sign-in";
import { openLegal } from "../../lib/legal";
import {
  completeReviewSignIn,
  isReviewEmail,
  requestReviewSignIn,
  signInButtonLabel,
} from "../../lib/review-login";
import { getSupabase } from "../../lib/supabase";
import { colors, controlHeight, fonts, space } from "../../theme";
import { Button, GoogleButton, OrDivider, SignInSheet, TextField } from "../../ui";

/**
 * Sign in (owner-v5 01) or Create account (02): Google first, or a 6-digit email code. On success
 * the root layout routes to onboarding (no salon yet) or the tabs. The Google Play review email
 * gets a password field instead of the code (owner-v9 01–02, release 1.0.1).
 */
// The testers' debug APK shows Google's raw error code next to the message (release 1.0.0).
const SHOW_GOOGLE_CODE = !!debugApkLabel(Constants.expoConfig?.extra);

export default function SignInScreen() {
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const creating = params.mode === "create";
  const [email, setEmail] = useState(params.email ?? "");
  const [error, setError] = useState<string>();
  const [googleError, setGoogleError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const reviewing = isReviewEmail(email);
  // "choosing": Google's chooser or consent is up. "signing-in": Google answered; the session and
  // the salon load while this sheet stays as it is, and the root layout then moves on once.
  const [google, setGoogle] = useState<"idle" | "choosing" | "signing-in">("idle");
  const googleBusy = google !== "idle";

  async function continueWithGoogle() {
    setGoogleError(undefined);
    setGoogle("choosing");
    const result = await signInWithGoogle(() => setGoogle("signing-in"));
    // Signed in: stay busy until the root layout shows Create your salon or Today.
    if (result.outcome === "signed-in") return;
    setGoogle("idle");
    setGoogleError(googleMessage(result, SHOW_GOOGLE_CODE));
  }

  async function signInForReview() {
    if (sending) return;
    setPasswordError(undefined);
    setSending(true);
    const result = await requestReviewSignIn(
      { email, password },
      webUrl(getEnv().EXPO_PUBLIC_WEB_URL),
    );
    if (!result.ok) {
      setSending(false);
      setPasswordError(result.message);
      return;
    }
    const auth = getSupabase().auth;
    const message = await completeReviewSignIn(result.tokenHash, (params) =>
      auth.verifyOtp(params),
    );
    // Signed in: stay busy until the root layout shows Today.
    if (!message) return;
    setSending(false);
    setPasswordError(message);
  }

  async function sendCode() {
    if (reviewing) {
      await signInForReview();
      return;
    }
    const address = email.trim().toLowerCase();
    if (!isValidEmail(address)) {
      setError(AUTH_MESSAGES.invalidEmail);
      return;
    }
    setError(undefined);
    setSending(true);
    const { error: sendError } = await getSupabase().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setSending(false);
    if (sendError) {
      setError(sendCodeErrorMessage(sendError));
      return;
    }
    router.push({ pathname: "/code", params: { email: address, sentAt: String(Date.now()) } });
  }

  return (
    <SignInSheet
      title={creating ? "Create your account" : "Sign in to Bookflow"}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))}
    >
      <GoogleButton onPress={() => void continueWithGoogle()} busy={googleBusy} />
      {google === "signing-in" ? (
        <Text style={styles.signingIn} accessibilityLiveRegion="polite">
          Signing you in…
        </Text>
      ) : null}
      {googleError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {googleError}
        </Text>
      ) : null}
      <OrDivider label="or use your email" />
      <Text style={styles.label}>Email</Text>
      <TextField
        label="Email"
        hideLabel
        placeholder="you@example.com"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError(undefined);
          if (passwordError) setPasswordError(undefined);
        }}
        error={error}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType={reviewing ? "next" : "send"}
        onSubmitEditing={() => void (reviewing ? undefined : sendCode())}
        editable={!googleBusy}
      />
      {reviewing ? (
        <>
          <Text style={styles.label}>Password</Text>
          <View>
            <TextField
              label="Password"
              hideLabel
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(undefined);
              }}
              error={passwordError}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void sendCode()}
              editable={!googleBusy && !sending}
              style={styles.passwordInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword((shown) => !shown)}
              hitSlop={8}
              style={styles.toggle}
            >
              <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
      <View style={[styles.send, reviewing && !!passwordError && styles.sendAfterError]}>
        <Button
          title={signInButtonLabel(email)}
          variant="action"
          onPress={() => void sendCode()}
          loading={sending}
          disabled={googleBusy}
        />
      </View>
      {reviewing ? null : (
        <Text style={styles.note}>We&apos;ll email you a 6-digit code. No password needed.</Text>
      )}
      {creating ? (
        <Text style={styles.terms}>
          By continuing you agree to the{" "}
          <Text accessibilityRole="link" style={styles.link} onPress={() => openLegal("terms")}>
            Terms
          </Text>{" "}
          and{" "}
          <Text accessibilityRole="link" style={styles.link} onPress={() => openLegal("privacy")}>
            Privacy Policy
          </Text>
          .
        </Text>
      ) : null}
    </SignInSheet>
  );
}

const styles = StyleSheet.create({
  // owner-v8 04: centred under the button, the same grey as the note.
  signingIn: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtle,
    textAlign: "center",
  },
  error: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  send: { marginTop: 19 },
  // owner-v9 02: the button sits 4 px closer under the password's error line.
  sendAfterError: { marginTop: 15 },
  // owner-v9 01: "Show" sits inside the field's right edge, in the note grey.
  passwordInput: { paddingRight: 76 },
  toggle: {
    position: "absolute",
    top: 0,
    right: 0,
    height: controlHeight,
    justifyContent: "center",
    paddingHorizontal: space(4),
  },
  toggleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.subtle },
  note: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtle,
    textAlign: "center",
  },
  terms: {
    marginTop: 54,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtle,
    textAlign: "center",
  },
  link: { color: colors.action },
});
