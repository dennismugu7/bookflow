import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { debugApkLabel } from "../../build-info";
import { AUTH_MESSAGES, isValidEmail, sendCodeErrorMessage } from "../../lib/auth-errors";
import { googleMessage } from "../../lib/google-auth";
import { signInWithGoogle } from "../../lib/google-sign-in";
import { openLegal } from "../../lib/legal";
import { getSupabase } from "../../lib/supabase";
import { colors, fonts } from "../../theme";
import { Button, GoogleButton, OrDivider, SignInSheet, TextField } from "../../ui";

/**
 * Sign in (owner-v5 01) or Create account (02): Google first, or a 6-digit email code. On success
 * the root layout routes to onboarding (no salon yet) or the tabs.
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
  const [googleBusy, setGoogleBusy] = useState(false);

  async function google() {
    setGoogleError(undefined);
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    setGoogleBusy(false);
    setGoogleError(googleMessage(result, SHOW_GOOGLE_CODE));
  }

  async function sendCode() {
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
      <GoogleButton onPress={() => void google()} busy={googleBusy} />
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
        }}
        error={error}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => void sendCode()}
      />
      <View style={styles.send}>
        <Button
          title="Send me a code"
          variant="action"
          onPress={() => void sendCode()}
          loading={sending}
        />
      </View>
      <Text style={styles.note}>We&apos;ll email you a 6-digit code. No password needed.</Text>
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
