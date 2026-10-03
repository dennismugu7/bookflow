import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AUTH_MESSAGES,
  resendSecondsLeft,
  sendCodeErrorMessage,
  verifyCodeErrorMessage,
} from "../../lib/auth-errors";
import { getSupabase } from "../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../theme";
import { Button, CodeInput, Screen } from "../../ui";

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
    if (token.length !== 6) {
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

  return (
    <Screen
      footer={<Button title="Sign in" onPress={() => void verify(code)} loading={verifying} />}
    >
      <View style={styles.heading}>
        <Text style={type.display}>Check your email</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          We sent a 6-digit code to <Text style={styles.email}>{email}</Text>. It expires in 10
          minutes.
        </Text>
      </View>

      <View style={styles.codeBlock}>
        <CodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(undefined);
          }}
          onComplete={(full) => void verify(full)}
          error={!!error}
          disabled={verifying}
        />
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : notice ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
      </View>

      <View style={styles.links}>
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
          <Text style={[styles.linkText, secondsLeft > 0 && styles.linkDisabled]}>
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use a different email"
          onPress={() => router.replace({ pathname: "/sign-in", params: { email } })}
          style={styles.link}
        >
          <Text style={styles.linkText}>Use a different email</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space(2), marginTop: space(6) },
  email: { fontFamily: fonts.semibold, color: colors.ink },
  codeBlock: { gap: space(3) },
  error: { ...type.caption, color: colors.danger },
  notice: { ...type.caption, color: colors.success },
  links: { gap: space(1) },
  link: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { fontFamily: fonts.bold, fontSize: 15, color: colors.brand },
  linkDisabled: { color: colors.muted },
});
