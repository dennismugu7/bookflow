import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, minTouch } from "../theme";
import { welcomeBackground } from "./illustrations";
import googleG from "./illustrations/google-g.png";

// The mockup is a 390 × 844 screen; shorter phones pull the sheet up in proportion, as Welcome does.
const MOCKUP_HEIGHT = 844;

type Props = { title: string; onBack: () => void; children: ReactNode };

/**
 * Sign in and Create account (owner-v5 01, 02): the sheet rises over Welcome's light-blue
 * background, with the wordmark where Welcome has it.
 */
export function SignInSheet({ title, onBack, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const k = Math.min(1, height / MOCKUP_HEIGHT);
  return (
    <View style={styles.fill}>
      <Image
        source={welcomeBackground}
        resizeMode="cover"
        accessible={false}
        style={styles.background}
      />
      <Text style={[styles.wordmark, { top: 96 * k }]} accessible={false}>
        Bookflow
      </Text>
      <KeyboardAvoidingView style={[styles.flex, { paddingTop: 170 * k }]} behavior="height">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.titleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Feather name="arrow-left" size={24} color={colors.ink} />
            </Pressable>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
          </View>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Google's official sign-in button: #4285F4, the G in a white square, white text. */
export function GoogleButton({ onPress, busy }: { onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.google, (pressed || busy) && styles.pressed]}
    >
      <View style={styles.gBox}>
        <Image source={googleG} accessible={false} style={styles.g} />
      </View>
      <Text style={styles.googleText}>Continue with Google</Text>
    </Pressable>
  );
}

/** "or use your email" between two hairlines. */
export function OrDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const GOOGLE_BLUE = "#4285F4";

// Sizes from owner-v5 01 at 390 pt.
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#A9DDF5" },
  flex: { flex: 1 },
  background: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  wordmark: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
    color: "#2A1E8C",
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D6D4DD",
    marginTop: 10,
  },
  titleRow: {
    height: minTouch,
    marginTop: 7,
    justifyContent: "center",
    paddingHorizontal: 56,
  },
  back: {
    position: "absolute",
    left: 10,
    width: minTouch,
    height: minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    textAlign: "center",
  },
  content: { paddingHorizontal: 24, paddingTop: 18 },
  google: {
    height: 52,
    borderRadius: 8,
    backgroundColor: GOOGLE_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  gBox: {
    position: "absolute",
    left: 3,
    top: 3,
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  g: { width: 22, height: 22 },
  googleText: { fontFamily: fonts.medium, fontSize: 17, color: colors.white },
  pressed: { opacity: 0.85 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 13 },
  line: { flex: 1, height: 1, backgroundColor: colors.hairline },
  dividerText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.faint },
});
