import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, minTouch } from "../../theme";
import { BrandBackdrop } from "../../ui";

/** First screen when signed out (02). Both choices lead to the same email-code sign-in. */
export default function WelcomeScreen() {
  return (
    <BrandBackdrop style={styles.fill}>
      <Text style={styles.wordmark} accessibilityRole="header">
        Bookflow
      </Text>
      <View style={styles.actions}>
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
    </BrandBackdrop>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", backgroundColor: "#2A1D84" },
  // Positions follow design 02, scaled to the screen height.
  wordmark: {
    position: "absolute",
    top: "13%",
    fontFamily: fonts.bold,
    fontSize: 50,
    letterSpacing: -1,
    color: "#F1EFFA",
  },
  actions: { position: "absolute", top: "43.5%", alignItems: "center", gap: 34 },
  create: {
    width: 217,
    height: 59,
    borderRadius: 22,
    backgroundColor: colors.welcomeGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: { fontFamily: fonts.bold, fontSize: 25, color: colors.white },
  signIn: { minHeight: minTouch, minWidth: 120, alignItems: "center", justifyContent: "center" },
  signInText: { fontFamily: fonts.medium, fontSize: 24, color: "#DCD8F0" },
  pressed: { opacity: 0.85 },
});
