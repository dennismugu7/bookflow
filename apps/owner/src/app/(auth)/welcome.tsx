import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, fonts, minTouch } from "../../theme";
import { WelcomeLoop, welcomeBackground } from "../../ui";

// The mockup is a 390 × 844 screen; shorter phones pull everything up in proportion.
const MOCKUP_HEIGHT = 844;

/**
 * First screen when signed out (owner-v2 10): the light-blue gradient, the wordmark and the
 * looping animation. Both choices lead to the same email-code sign-in.
 */
export default function WelcomeScreen() {
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
      <View style={[styles.brand, { top: 96 * k }]}>
        <Text style={styles.wordmark} accessibilityRole="header">
          Bookflow
        </Text>
        <Text style={styles.subtitle}>Share your link. Bookings land.</Text>
      </View>
      <WelcomeLoop style={[styles.stage, { top: 210 * k }]} />
      <View style={[styles.actions, { bottom: 120 * k - SIGN_IN_SLACK }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create for free"
          onPress={() => router.push({ pathname: "/sign-in", params: { mode: "create" } })}
          style={({ pressed }) => [styles.create, pressed && styles.pressed]}
        >
          <Text style={styles.createText}>Create for free</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => router.push("/sign-in")}
          style={styles.signIn}
        >
          <Text style={styles.signInText}>Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const GREEN = "#2FD573";
// The Sign in tap area reaches this far below its label.
const SIGN_IN_SLACK = (minTouch - 21) / 2;

// Sizes and colours from 10-welcome-animation.html.
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#A9DDF5" },
  // Explicit size: otherwise the web target lays the image out at its pixel size.
  background: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  brand: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  wordmark: {
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
    color: "#2A1E8C",
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 19,
    color: "#3B3A4A",
  },
  stage: { position: "absolute", left: 28, right: 28 },
  actions: { position: "absolute", left: 28, right: 28 },
  create: {
    height: 56,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  createText: { fontFamily: fonts.bold, fontSize: 18, color: "#0B2A17" },
  // A 44 px tap area around the 17 px label; the margin keeps the label 18 px under the button.
  signIn: {
    marginTop: 18 - SIGN_IN_SLACK,
    minHeight: minTouch,
    minWidth: 120,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21, color: colors.ink },
  pressed: { opacity: 0.85 },
});
