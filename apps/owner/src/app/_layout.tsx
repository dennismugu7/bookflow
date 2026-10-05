import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  useFonts,
} from "@expo-google-fonts/urbanist";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getEnv } from "../env";
import { useGoogleCallbackLinks } from "../lib/google-sign-in";
import { appReady, screenGroup } from "../lib/launch";
import { setUpNotifications } from "../lib/push";
import { SessionProvider, useSession } from "../lib/session";
import { colors, space, type } from "../theme";
import { Button } from "../ui";

void SplashScreen.preventAutoHideAsync();
setUpNotifications();

/** The env error message, or null when the Supabase values were bundled. */
function configError(): string | null {
  try {
    getEnv();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export default function RootLayout() {
  const missingConfig = configError();
  if (missingConfig) return <ConfigError message={missingConfig} />;
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}

/**
 * Signed-out users only see (auth); signed-in users without a salon only see (onboarding);
 * everyone else only sees (app). Android's system splash stays up until we know which, then the
 * first screen shows straight away (no second splash; Dennis, 2026-10-04).
 */
function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });
  const { session, membership, membershipError } = useSession();
  const googleCallback = useGoogleCallbackLinks();
  const [launched, setLaunched] = useState(false);

  const ready = appReady({
    fontsSettled: fontsLoaded || !!fontError,
    signedIn: !!session,
    sessionKnown: session !== undefined,
    membershipKnown: membership !== undefined || !!membershipError,
    callbackPending: googleCallback.pending,
  });

  useEffect(() => {
    if (!ready || launched) return;
    SplashScreen.hide();
    setLaunched(true);
  }, [ready, launched]);

  return (
    <View style={styles.root}>
      {ready ? (
        <Routes />
      ) : launched ? (
        // Later gaps, e.g. while a new sign-in loads the salon: a plain wait, not a splash.
        <View style={styles.waiting}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : null}
    </View>
  );
}

function Routes() {
  const { session, membership, membershipError, reloadMembership } = useSession();
  const signedIn = !!session;
  const group = screenGroup({ signedIn, hasSalon: !!membership });

  if (signedIn && membershipError) {
    return (
      <View style={styles.error}>
        <Text style={type.title}>Couldn&apos;t load your salon</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          Check your connection and try again.
        </Text>
        <Button title="Try again" onPress={() => void reloadMembership()} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
      <Stack.Protected guard={group === "auth"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={group === "onboarding"}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={group === "app"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      {/* After deleting the account (owner-v7 05): shown while the session is cleared. */}
      <Stack.Screen name="account-deleted" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

/** Shown when a build or update was bundled without the EAS environment variables. */
function ConfigError({ message }: { message: string }) {
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return (
    <View style={styles.error}>
      <Text style={styles.plainTitle}>This build isn&apos;t configured</Text>
      <Text style={styles.plainBody}>
        It was bundled without the Supabase settings. Run the &quot;EAS env sync&quot; workflow,
        then publish a new update or build.
      </Text>
      <Text style={styles.plainCaption}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  waiting: { flex: 1, alignItems: "center", justifyContent: "center" },
  // System font: this screen can appear before Urbanist has loaded.
  plainTitle: { fontSize: 22, fontWeight: "700", color: colors.ink },
  plainBody: { fontSize: 15, color: colors.muted },
  plainCaption: { fontSize: 13, color: colors.muted },
  error: {
    flex: 1,
    justifyContent: "center",
    padding: space(5),
    gap: space(4),
    backgroundColor: colors.white,
  },
});
