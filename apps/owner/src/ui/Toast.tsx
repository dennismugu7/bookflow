import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getToast, subscribeToast } from "../lib/toast";
import { colors, fonts } from "../theme";

const FADE_MS = 180;
const SHOW_MS = 2000;

/**
 * Shows the latest toast top right, below the status bar: fade in, about 2 s, fade out. Above the
 * keyboard by being at the top, and read out by screen readers. Mounted once, over the app.
 */
export function ToastHost() {
  const toast = useSyncExternalStore(subscribeToast, getToast);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const [shownId, text] = [toast?.id, toast?.text];

  useEffect(() => {
    if (!shownId || !text) return;
    AccessibilityInfo.announceForAccessibility(text);
    opacity.stopAnimation();
    const run = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.delay(SHOW_MS),
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [shownId, text, opacity]);

  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { top: insets.top + 8, opacity }]}
    >
      <Feather name="check" size={16} color={colors.success} />
      <Text style={styles.text}>{toast.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successTint,
    elevation: 4,
  },
  text: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.success },
});
