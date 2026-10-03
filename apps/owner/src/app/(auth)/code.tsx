import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AUTH_MESSAGES,
  resendSecondsLeft,
  sanitizeCode,
  sendCodeErrorMessage,
  verifyCodeErrorMessage,
} from "../../lib/auth-errors";
import { getSupabase } from "../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../theme";
import { AuthSheet, Button, SheetText, TextField } from "../../ui";

const LENGTH = 6;

export default function CodeScreen() {
  const params = useLocalSearchParams<{ email: string; sentAt?: string }>();
  const email = params.email ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [sentAt, setSentAt] = useState(() => Number(params.sentAt) || Date.now());
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = resendSecondsLeft(sentAt, now);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  async function verify(token: string) {
    if (token.length !== LENGTH) {
      setError(AUTH_MESSAGES.incompleteCode);
      return;
    }
    setError(undefined);
    setVerifying(true);
    const { error: verifyError } = await getSupabase().auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setVerifying(false);
    // On success the root layout sees the new session and leaves the sign-in screens.
    if (verifyError) {
      setError(verifyCodeErrorMessage(verifyError));
      setCode("");
    }
  }

  async function resend() {
    setError(undefined);
    setNotice(undefined);
    const { error: sendError } = await getSupabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (sendError) {
      setError(sendCodeErrorMessage(sendError));
      return;
    }
    setSentAt(Date.now());
    setNow(Date.now());
    setCode("");
    setNotice("We sent a new code.");
  }

  const backToSignIn = () => router.replace({ pathname: "/sign-in", params: { email } });

  return (
    <AuthSheet title="Enter your code" onBack={backToSignIn}>
      <SheetText center={false}>
        We sent a 6-digit code to {email}. Enter it below to activate your account.
      </SheetText>

      <View style={styles.field}>
        <Text style={styles.label}>Verification code</Text>
        <TextField
          variant="sheet"
          label="Verification code"
          hideLabel
          value={code}
          onChangeText={(text) => {
            const next = sanitizeCode(text);
            setCode(next);
            if (error) setError(undefined);
            if (next.length === LENGTH) void verify(next);
          }}
          error={error}
          editable={!verifying}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          style={styles.codeInput}
        />
        {notice && !error ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
      </View>

      <Button title="Verify" variant="blue" onPress={() => void verify(code)} loading={verifying} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          secondsLeft > 0 ? `Resend code in ${secondsLeft} seconds` : "Resend code"
        }
        accessibilityState={{ disabled: secondsLeft > 0 }}
        disabled={secondsLeft > 0}
        onPress={() => void resend()}
        style={styles.link}
      >
        <Text style={styles.linkLine}>
          Didn&apos;t get a code?{" "}
          <Text style={secondsLeft > 0 ? styles.resendWait : styles.resend}>
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend"}
          </Text>
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to sign in"
        onPress={backToSignIn}
        style={styles.link}
      >
        <Text style={styles.linkLine}>Back to sign in</Text>
      </Pressable>
    </AuthSheet>
  );
}

const styles = StyleSheet.create({
  field: { gap: space(3), marginTop: space(2) },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
    letterSpacing: 1.6,
    color: colors.text,
    marginLeft: space(2),
  },
  codeInput: { letterSpacing: 8, fontFamily: fonts.semibold, fontSize: 20 },
  notice: { ...type.caption, color: colors.success },
  link: { minHeight: minTouch, alignItems: "center", justifyContent: "center" },
  linkLine: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: 1.6, color: colors.text },
  resend: { color: colors.blue },
  resendWait: { color: colors.muted },
});
