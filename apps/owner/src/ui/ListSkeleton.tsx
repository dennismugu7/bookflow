import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { SKELETON_DELAY_MS, skeletonVisible } from "../lib/list-phase";
import { colors } from "../theme";
import { AGENDA_SPACING } from "./today/AgendaList";
import { CLOSED_CARD } from "./today/BookingCard";

const ROWS = 6;
const CARDS = 3;
const PULSE_MS = 600;

/** False until SKELETON_DELAY_MS after mount, so a fast load shows no loading cue at all. */
export function useLoadingDelay(): boolean {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(SKELETON_DELAY_MS), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  // Mounted only while loading.
  return skeletonVisible("loading", elapsed);
}

/**
 * Grey placeholder rows (the Clients rows) or cards (closed booking cards) while a list's first
 * load is in flight (QA 8663, M-01). One accessibility element that says what is loading; pulses
 * gently unless "Remove animations" is on.
 */
export function ListSkeleton({
  variant,
  label,
  style,
}: {
  variant: "rows" | "cards";
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const visible = useLoadingDelay();
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean>();

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => live && setReduceMotion(on));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible || reduceMotion !== false) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      opacity.setValue(1);
    };
  }, [visible, reduceMotion, opacity]);

  if (!visible) return null;
  return (
    <Animated.View
      style={[variant === "cards" && styles.cards, style, { opacity }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      {variant === "rows"
        ? Array.from({ length: ROWS }, (_, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.circle} />
              <View style={styles.lines}>
                <View style={[styles.bar, styles.barLong]} />
                <View style={[styles.bar, styles.barShort]} />
              </View>
            </View>
          ))
        : Array.from({ length: CARDS }, (_, i) => <View key={i} style={styles.card} />)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The Clients row (clients.tsx): min-height 69, 20 in, a 44 px avatar, 12 to the text.
  row: { minHeight: 69, flexDirection: "row", alignItems: "center", paddingLeft: 20, gap: 12 },
  circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.softFill },
  lines: { gap: 8 },
  bar: { borderRadius: 6, backgroundColor: colors.softFill },
  barLong: { width: 140, height: 12 },
  barShort: { width: 200, height: 10 },
  cards: { marginTop: AGENDA_SPACING.top, gap: AGENDA_SPACING.cardGap },
  card: {
    height: CLOSED_CARD.height,
    borderRadius: CLOSED_CARD.borderRadius,
    backgroundColor: colors.softFill,
  },
});
