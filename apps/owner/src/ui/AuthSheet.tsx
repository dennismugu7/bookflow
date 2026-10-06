import Feather from "@expo/vector-icons/Feather";
import { useMemo, useRef, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { closesSheet, sheetOffset } from "../lib/sheet-drag";
import { colors, fonts, minTouch, space } from "../theme";
import { BrandBackdrop } from "./BrandBackdrop";

type Props = {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  /** Pinned to the bottom of the sheet, e.g. the main button. */
  footer?: ReactNode;
};

/**
 * White sheet with a grabber over the brand gradient, as in designs 03–05. With `onBack`, pulling
 * the grabber (or the title strip) down far enough does the same as the back arrow; a short pull
 * springs back (release 1.0.0).
 */
export function AuthSheet({ title, onBack, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const drag = useHandleDrag(onBack);
  return (
    <BrandBackdrop style={styles.fill}>
      <KeyboardAvoidingView
        style={[styles.fill, styles.dim, { paddingTop: insets.top + 40 }]}
        behavior="height"
      >
        <Animated.View style={[styles.sheet, drag.style]} onLayout={drag.onLayout}>
          <View {...drag.handlers}>
            <View style={styles.grabber} />
            <View style={styles.titleRow}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={onBack}
                hitSlop={8}
                style={styles.back}
              >
                <Feather name="arrow-left" size={24} color="#9A9A9A" />
              </Pressable>
            ) : null}
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { paddingBottom: insets.bottom + space(4) }]}>
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </BrandBackdrop>
  );
}

function useHandleDrag(onBack: (() => void) | undefined) {
  const offset = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  const back = useRef(onBack);
  back.current = onBack;
  const enabled = !!onBack;

  return useMemo(() => {
    const springBack = () =>
      Animated.spring(offset, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onPanResponderMove: (_, g) => offset.setValue(sheetOffset(g.dy)),
      onPanResponderRelease: (_, g) => {
        if (!closesSheet(g.dy, g.vy, height.current)) return springBack();
        // Back to rest straight away: leaving swaps the screen, it doesn't hide this one.
        springBack();
        back.current?.();
      },
      onPanResponderTerminate: springBack,
      onPanResponderTerminationRequest: () => false,
    });
    return {
      style: { transform: [{ translateY: offset }] },
      onLayout: (e: { nativeEvent: { layout: { height: number } } }) => {
        height.current = e.nativeEvent.layout.height;
      },
      handlers: enabled ? responder.panHandlers : {},
    };
  }, [offset, enabled]);
}

/** Centred, letter-spaced copy used for labels and notes on the sheet. */
export function SheetText({ children, center = true }: { children: ReactNode; center?: boolean }) {
  return <Text style={[styles.sheetText, center && styles.center]}>{children}</Text>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#2A1D84" },
  // The page behind the sheet is dimmed, as in 03–05.
  dim: { backgroundColor: "rgba(10, 8, 30, 0.55)" },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginHorizontal: 6,
  },
  grabber: {
    alignSelf: "center",
    width: 35,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CFCFCF",
    marginTop: 7,
  },
  titleRow: {
    minHeight: minTouch,
    justifyContent: "center",
    marginTop: space(3),
    paddingHorizontal: space(12),
  },
  back: {
    position: "absolute",
    left: space(5),
    width: minTouch,
    height: minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.regular, fontSize: 21, color: colors.text, textAlign: "center" },
  content: {
    paddingHorizontal: space(6),
    paddingTop: space(5),
    paddingBottom: space(6),
    gap: space(4),
  },
  footer: { paddingHorizontal: space(7), paddingTop: space(2), gap: space(3) },
  sheetText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1.4,
    color: colors.text,
  },
  center: { textAlign: "center" },
});
