import { SUPPORT_EMAIL } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts } from "../theme";
import { FooterButton } from "../ui/DeletionPage";

const toWelcome = () => router.replace("/welcome");

/**
 * Account deleted (owner-v7 05, original 38). Outside the signed-in screens, so it stays up while
 * the session is cleared. Done and Android's back button both go to Welcome, never into the app.
 */
export default function AccountDeletedScreen() {
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      // Android only; the web target (design captures) has no back button to catch.
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        toWelcome();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.middle}>
        <View style={styles.circle}>
          <Feather name="check" size={46} color={colors.white} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Your account has been deleted
        </Text>
        <Text style={styles.body}>
          We&apos;ll miss you around here! If you need anything at all before you head out, feel
          free to reach out to {SUPPORT_EMAIL}.
        </Text>
      </View>
      <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
        <FooterButton title="Done" onPress={toWelcome} />
      </View>
    </View>
  );
}

// Sizes from owner-v7 05 at 390 pt.
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  middle: { flex: 1, alignItems: "center", paddingTop: 197, paddingHorizontal: 30 },
  circle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.action,
    experimental_backgroundImage:
      "radial-gradient(circle at 35% 30%, #86C2FF 0%, #1E7BF2 60%, #1A6EE0 100%)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 30,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 35,
    color: colors.ink,
  },
  body: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.subtle,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingHorizontal: 24,
    paddingTop: 15,
  },
});
