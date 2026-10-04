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
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getEnv } from "../env";
import { SessionProvider, useSession } from "../lib/session";
import { colors, space, type } from "../theme";
import { Button, Splash } from "../ui";

void SplashScreen.preventAutoHideAsync();

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
 * everyone else only sees (app). The splash (01) stays on top until we know which.
 */
function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });
  const { session, membership, membershipError } = useSession();
  const [splashUp, setSplashUp] = useState(true);

  const signedIn = !!session;
  const ready =
    (fontsLoaded || !!fontError) &&
    session !== undefined &&
    (!signedIn || membership !== undefined || membershipError);

  // The splash comes back whenever we lose track again, e.g. while a new sign-in loads the salon.
  if (!ready && !splashUp) setSplashUp(true);

  // The system splash (B on a solid colour) hands over once 01 is drawn in its place.
  const systemSplashUp = useRef(true);
  const hideSystemSplash = useCallback(() => {
    if (!systemSplashUp.current) return;
    systemSplashUp.current = false;
    SplashScreen.hide();
  }, []);
  const finishSplash = useCallback(() => setSplashUp(false), []);

  return (
    <View style={styles.root}>
      {ready ? <Routes /> : null}
      {splashUp ? (
        <Splash ready={!!ready} onShown={hideSystemSplash} onDone={finishSplash} />
      ) : null}
    </View>
  );
}

function Routes() {
  const { session, membership, membershipError, reloadMembership } = useSession();
  const signedIn = !!session;

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
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && membership === null}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !!membership}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
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
