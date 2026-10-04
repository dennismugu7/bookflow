import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet } from "react-native";

import splash from "../../assets/splash/splash.png";
import { SPLASH_FADE_MS, splashHoldMs } from "../lib/splash-timing";

/** The system splash's colour (app.json), behind 01 while the image decodes. */
const SPLASH_BACKGROUND = "#221671";

/**
 * The in-app splash: 01 itself, full screen, over the first screen. It takes over from the system
 * splash (B on a solid colour) once the image is drawn, stays until `ready` and at least 600 ms,
 * then fades out and calls `onDone`.
 */
export function Splash({
  ready,
  onShown,
  onDone,
}: {
  ready: boolean;
  onShown?: () => void;
  onDone?: () => void;
}) {
  const shownAt = useRef(Date.now());
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean>();

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => live && setReduceMotion(on));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || reduceMotion === undefined) return;
    const timer = setTimeout(
      () => {
        if (reduceMotion) {
          onDone?.();
          return;
        }
        Animated.timing(opacity, {
          toValue: 0,
          duration: SPLASH_FADE_MS,
          useNativeDriver: true,
        }).start(() => onDone?.());
      },
      splashHoldMs(shownAt.current, Date.now()),
    );
    return () => clearTimeout(timer);
  }, [ready, reduceMotion, opacity, onDone]);

  return (
    <Animated.View
      style={[styles.fill, { opacity }]}
      pointerEvents={ready ? "none" : "auto"}
      accessibilityLabel="Bookflow"
      accessibilityRole="image"
    >
      <Image source={splash} resizeMode="cover" style={styles.image} onLoadEnd={onShown} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: SPLASH_BACKGROUND,
  },
  // Explicit size: otherwise the web target lays the image out at its pixel size.
  image: { width: "100%", height: "100%" },
});
