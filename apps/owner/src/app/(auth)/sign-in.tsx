import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AUTH_MESSAGES, isValidEmail, sendCodeErrorMessage } from "../../lib/auth-errors";
import { getSupabase } from "../../lib/supabase";
import { colors, radius, space, type } from "../../theme";
import { Button, Screen, TextField } from "../../ui";

export default function SignInScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

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
    <Screen footer={<Button title="Send code" onPress={() => void sendCode()} loading={sending} />}>
      <View style={styles.logo} accessibilityLabel="Bookflow">
        <Text style={styles.logoText}>B</Text>
      </View>
      <View style={styles.heading}>
        <Text style={type.display}>Sign in to Bookflow</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          We&apos;ll email you a 6-digit code. No password needed.
        </Text>
      </View>
      <TextField
        label="Email"
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space(6),
  },
  logoText: { ...type.title, color: colors.white },
  heading: { gap: space(2) },
});
