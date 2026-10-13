import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import {
  END_MS,
  EXIT_MS,
  INTRO_MS,
  LOGO,
  REDUCED_MS,
  REDUCED_TRACKS,
  SPLASH_COLORS,
  TRACKS,
  logoUnit,
  readyToExit,
} from "../lib/splash-motion";
import type { Track } from "../lib/welcome-motion";

const useNativeDriver = Platform.OS !== "web";

// The B traced from the app icon (splash-animation.html), in the icon's 1024 × 1024 space. The
// icon only exists as PNG, and logo-mark.svg is a different drawing (Dennis, 2026-10-13).
// Each part's box is padded so its anti-aliased edge isn't clipped.
const PAD = 2;
type Box = { x: number; y: number; w: number; h: number };
const pad = ({ x, y, w, h }: Box): Box => ({ x: x - PAD, y: y - PAD, w: w + 2 * PAD, h: h + 2 * PAD });
const STEM = pad({ x: 343, y: 278, w: 87, h: 467 });
const TOP = pad({ x: 430, y: 278, w: 222, h: 272 });
const BOT = pad({ x: 343, y: 515, w: 339, h: 230 });
const TOP_PATH =
  "M430 278H530C600 278 652 330 652 400C652 455 610 500 560 522C530 536 500 546 465 550V470H520C550 470 568 448 568 418C568 388 548 365 520 365H430Z";
const BOT_PATH =
  "M430 745H545C620 745 682 690 682 620C682 575 664 540 640 515L583 553C594 572 598 588 598 605C598 638 572 658 540 658H430Z";
const WEDGE_PATH = "M343 745L430 658V745Z";
/** The halo: r 250 around the icon's centre. */
const HALO = { x: 262, y: 262, size: 500 };
/** The stage: the HTML's viewBox, 600 units square around the icon's centre. */
const STAGE = { x: 212, size: 600 };

/**
 * The animated splash (docs/specs/splash-animation.md): the B folds into shape, gives one
 * heartbeat, then cross-fades to the first screen. It takes over from Android's plain #2B2183
 * splash on its first frame, plays once through the heartbeat even if the app is ready early, and
 * holds the final frame while it isn't. With "Remove animations" on, the logo and halo only fade
 * in. Animates transform and opacity only, on the native driver.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const u = logoUnit(width, height);
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [laidOut, setLaidOut] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>();
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => live && setReduceMotion(on));
    return () => {
      live = false;
    };
  }, []);

  // Frame 0 is the plain background, the same as the system splash, so hiding it can't flash.
  useEffect(() => {
    if (!laidOut || reduceMotion === undefined) return;
    SplashScreen.hide();
    const introMs = reduceMotion ? REDUCED_MS : INTRO_MS;
    Animated.timing(progress, {
      toValue: introMs,
      duration: introMs,
      easing: Easing.linear,
      useNativeDriver,
    }).start(({ finished }) => {
      if (!finished) return;
      setIntroDone(true);
      // The halo settles for a moment after the heartbeat; the exit may already be running.
      if (!reduceMotion)
        Animated.timing(progress, {
          toValue: END_MS,
          duration: END_MS - INTRO_MS,
          easing: Easing.linear,
          useNativeDriver,
        }).start();
    });
    return () => progress.stopAnimation();
  }, [laidOut, reduceMotion, progress]);

  useEffect(() => {
    if (!readyToExit({ introDone, appReady: ready })) return;
    Animated.timing(fade, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.bezier(0, 0, 0.58, 1),
      useNativeDriver,
    }).start(({ finished }) => finished && onDone());
  }, [introDone, ready, fade, onDone]);

  const at = (track: Track) => progress.interpolate(track);
  const deg = ({ inputRange, outputRange }: Track) =>
    progress.interpolate({ inputRange, outputRange: outputRange.map((value) => `${value}deg`) });

  // Box and transform origin of a part, in points, relative to the logo's box.
  const place = (box: Box, originX: number, originY: number) => ({
    position: "absolute" as const,
    left: (box.x - LOGO.x) * u,
    top: (box.y - LOGO.y) * u,
    width: box.w * u,
    height: box.h * u,
    transformOrigin: [(originX - box.x) * u, (originY - box.y) * u, 0],
  });
  const art = (box: Box) => ({
    width: box.w * u,
    height: box.h * u,
    viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`,
  });
  const motion = reduceMotion === false;

  return (
    <Animated.View
      style={[styles.root, { opacity: fade }]}
      onLayout={() => setLaidOut(true)}
      accessibilityLabel="Bookflow"
      accessibilityRole="image"
    >
      <StatusBar style="light" />
      {reduceMotion === undefined ? null : (
        <View style={{ width: STAGE.size * u, height: STAGE.size * u }}>
          <Animated.View
            style={[
              styles.halo,
              {
                left: (HALO.x - STAGE.x) * u,
                top: (HALO.y - STAGE.x) * u,
                width: HALO.size * u,
                height: HALO.size * u,
                borderRadius: (HALO.size * u) / 2,
              },
              motion
                ? { opacity: at(TRACKS.haloOpacity), transform: [{ scale: at(TRACKS.haloScale) }] }
                : { opacity: at(REDUCED_TRACKS.haloOpacity) },
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                left: (LOGO.x - STAGE.x) * u,
                top: (LOGO.y - STAGE.x) * u,
                width: LOGO.width * u,
                height: LOGO.height * u,
              },
              motion
                ? { transform: [{ scale: at(TRACKS.markScale) }] }
                : { opacity: at(REDUCED_TRACKS.logoOpacity) },
            ]}
          >
            <Animated.View
              style={[
                place(STEM, STEM.x + STEM.w / 2, STEM.y + STEM.h - PAD),
                motion && {
                  opacity: at(TRACKS.stemOpacity),
                  transform: [{ scaleY: at(TRACKS.stemScaleY) }],
                },
              ]}
            >
              <Svg {...art(STEM)}>
                <Rect x={343} y={278} width={87} height={467} fill={SPLASH_COLORS.pale} />
              </Svg>
            </Animated.View>
            <Animated.View
              style={[
                place(TOP, TOP.x + PAD, TOP.y + TOP.h / 2),
                motion && {
                  opacity: at(TRACKS.topOpacity),
                  transform: [{ scaleX: at(TRACKS.topScaleX) }],
                },
              ]}
            >
              <Svg {...art(TOP)}>
                <Path d={TOP_PATH} fill={SPLASH_COLORS.pale} />
              </Svg>
            </Animated.View>
            <Animated.View
              style={[
                place(BOT, BOT.x + PAD, BOT.y + BOT.h - PAD),
                motion && {
                  opacity: at(TRACKS.botOpacity),
                  transform: [{ rotate: deg(TRACKS.botRotate) }, { scale: at(TRACKS.botScale) }],
                },
              ]}
            >
              <Svg {...art(BOT)}>
                <Path d={BOT_PATH} fill={SPLASH_COLORS.mint} />
                <Path d={WEDGE_PATH} fill={SPLASH_COLORS.mint} />
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SPLASH_COLORS.background,
  },
  halo: { position: "absolute", backgroundColor: SPLASH_COLORS.halo },
});
