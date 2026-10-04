import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { AUTH_MESSAGES, isValidEmail, sendCodeErrorMessage } from "../../lib/auth-errors";
import { getSupabase } from "../../lib/supabase";
import { AuthSheet, Button, TextField } from "../../ui";

/** Email step of sign-in (05), or of "Create for free" (03): both send the same 6-digit code. */
export default function SignInScreen() {
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const creating = params.mode === "create";
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
    <AuthSheet
      title={creating ? "Create your Bookflow" : "Login to Bookflow"}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))}
      footer={
        <Button
          title={creating ? "Create for free" : "Continue"}
          variant="blue"
          onPress={() => void sendCode()}
          loading={sending}
        />
      }
    >
      <TextField
        variant="sheet"
        label="Enter email:"
        placeholder="address@mail.com"
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
    </AuthSheet>
  );
}
