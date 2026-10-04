import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { askPhonePermission, registerThisPhone } from "../../lib/push";
import { colors, fonts, minTouch } from "../../theme";
import { Button } from "../../ui";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

/** "Know the moment someone books" (owner-v5 03): shown once, then Android's own prompt. */
export default function AllowNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [asking, setAsking] = useState(false);

  async function turnOn() {
    setAsking(true);
    if ((await askPhonePermission()) === "granted") await registerThisPhone();
    setAsking(false);
    leave();
  }

  return (
    <View style={[styles.page, { paddingBottom: insets.bottom + 27 }]}>
      <View style={[styles.top, { marginTop: Math.max(120, insets.top + 24) }]}>
        <View style={styles.circle}>
          <Text style={styles.bell} accessible={false}>
            🔔
          </Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Know the moment someone books
        </Text>
        <Text style={styles.body}>
          We&apos;ll tell you about new bookings and cancellations, even when the app is closed.
        </Text>
      </View>
      <View>
        <Button
          title="Turn on notifications"
          variant="action"
          onPress={() => void turnOn()}
          loading={asking}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Not now"
          onPress={leave}
          style={({ pressed }) => [styles.notNow, pressed && styles.pressed]}
        >
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Sizes from owner-v5 03 at 390 × 844.
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  top: { alignItems: "center", paddingHorizontal: 8 },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.actionTint,
    alignItems: "center",
    justifyContent: "center",
  },
  bell: { fontSize: 60, lineHeight: 72 },
  title: {
    marginTop: 26,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 29,
    color: colors.ink,
    textAlign: "center",
  },
  body: {
    marginTop: 11,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
    textAlign: "center",
  },
  notNow: {
    marginTop: 4,
    minHeight: minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  notNowText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  pressed: { opacity: 0.6 },
});
