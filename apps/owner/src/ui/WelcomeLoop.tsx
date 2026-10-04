import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  EXAMPLES,
  LOOP_MS,
  REST_AT,
  TRACKS,
  nextExample,
  welcomeDay,
  type Track,
} from "../lib/welcome-motion";
import { colors, fonts } from "../theme";

// Colours of the mockup's little scenes (owner-v2 10), used nowhere else.
const BUBBLE = "#DCF8C6";
const ROW = "#F6F5FA";
const BAR = "#C9C6D6";
const BADGE_TEXT = "#1E7F4F";
const BADGE = "#DDF3E6";
const RING = "rgba(91,69,224,0.6)";

const useNativeDriver = Platform.OS !== "web";

/**
 * The welcome screen's 6-second loop (owner-v2 10): a link is shared → a client taps a time → the
 * booking lands in Today, with a different example each loop. Built on Animated only, so it ships
 * over the air. Still on its final frame when "Remove animations" is on; paused when not focused.
 */
export function WelcomeLoop({ style }: { style?: StyleProp<ViewStyle> }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [example, setExample] = useState(0);
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

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion === undefined) return;
      if (reduceMotion) {
        progress.setValue(REST_AT);
        return;
      }
      let running = true;
      const run = (from: number) => {
        Animated.timing(progress, {
          toValue: 1,
          duration: (1 - from) * LOOP_MS,
          easing: Easing.linear,
          useNativeDriver,
        }).start(({ finished }) => {
          if (!finished || !running) return;
          // Every card is faded out at the loop's end, so the next example swaps in unseen.
          setExample(nextExample);
          progress.setValue(0);
          run(0);
        });
      };
      // Resume where it paused.
      progress.stopAnimation((value) => run(value < 1 ? value : 0));
      return () => {
        running = false;
        progress.stopAnimation();
      };
    }, [progress, reduceMotion]),
  );

  const at = (track: Track) => progress.interpolate(track);
  const current = EXAMPLES[example]!;

  return (
    <View
      style={[styles.stage, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.bubble,
          { opacity: at(TRACKS.bubbleOpacity), transform: [{ translateY: at(TRACKS.bubbleY) }] },
        ]}
      >
        <Text style={styles.bubbleTitle}>Book with Amani Beauty Studio</Text>
        <Text style={styles.bubbleText}>{current.services}</Text>
        <Text style={styles.bubbleLink}>bookflow.app/s/amani</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.ring,
          styles.ring1,
          { opacity: at(TRACKS.tap1Opacity), transform: [{ scale: at(TRACKS.tap1Scale) }] },
        ]}
      />

      <Animated.View
        style={[
          styles.times,
          { opacity: at(TRACKS.timesOpacity), transform: [{ translateY: at(TRACKS.timesY) }] },
        ]}
      >
        <View style={styles.chip}>
          <Text style={styles.chipText}>8:00</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{current.time}</Text>
          {/* Purple fill and white text fade in over the white chip. */}
          <Animated.View style={[styles.chipPicked, { opacity: at(TRACKS.pick) }]}>
            <Text style={[styles.chipText, styles.chipTextPicked]}>{current.time}</Text>
          </Animated.View>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>14:00</Text>
        </View>
      </Animated.View>
      <Animated.View
        style={[
          styles.ring,
          styles.ring2,
          { opacity: at(TRACKS.tap2Opacity), transform: [{ scale: at(TRACKS.tap2Scale) }] },
        ]}
      />

      <Animated.View
        style={[
          styles.today,
          { opacity: at(TRACKS.todayOpacity), transform: [{ translateY: at(TRACKS.todayY) }] },
        ]}
      >
        <View style={styles.todayHead}>
          <Text style={styles.todayHeadText}>Today</Text>
          <Text style={styles.todayHeadText}>{welcomeDay()}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.bar} />
          <Text style={styles.rowTime}>09:00</Text>
          <Text style={styles.rowText}>Box braids · Achieng</Text>
        </View>
        <Animated.View
          style={[
            styles.row,
            styles.rowNew,
            {
              opacity: at(TRACKS.dropOpacity),
              transform: [{ translateY: at(TRACKS.dropY) }, { scale: at(TRACKS.dropScale) }],
            },
          ]}
        >
          <View style={[styles.bar, styles.barNew]} />
          <Text style={styles.rowTime}>{current.time}</Text>
          <Text style={styles.rowText}>{current.who}</Text>
          <Text style={styles.badge}>New</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const ringSize = 44;

// Sizes and positions from 10-welcome-animation.html. Normal text there renders in Urbanist 500,
// the lightest weight it loads.
const styles = StyleSheet.create({
  stage: { height: 330 },
  bubble: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 250,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: BUBBLE,
    shadowColor: "#143C5A",
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  bubbleTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.ink,
    marginBottom: 2,
  },
  bubbleText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.ink },
  bubbleLink: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.action },
  ring: {
    position: "absolute",
    width: ringSize,
    height: ringSize,
    borderRadius: ringSize / 2,
    borderWidth: 3,
    borderColor: RING,
  },
  ring1: { left: 150, top: 44 },
  ring2: { right: 62, top: 90 },
  times: { position: "absolute", right: 0, top: 92, flexDirection: "row", gap: 8 },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: "center",
    shadowColor: "#143C5A",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chipPicked: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    backgroundColor: colors.select,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  chipTextPicked: { color: colors.white },
  today: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 160,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#143C5A",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  // 10 px to the first row: in the HTML the heading's and the row's margins collapse.
  todayHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  todayHeadText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.subtle },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: ROW,
    marginTop: 8,
  },
  rowNew: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.select },
  bar: { width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: BAR },
  barNew: { backgroundColor: colors.select },
  rowTime: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 17, width: 46, color: colors.ink },
  rowText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 17, color: colors.ink },
  badge: {
    marginLeft: "auto",
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 14,
    color: BADGE_TEXT,
    backgroundColor: BADGE,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
});
