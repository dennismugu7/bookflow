import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { closesSheet, sheetOffset, startsSheetDrag } from "../lib/sheet-drag";
import { colors, minTouch, space } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * "close": a white sheet with a close ×, over the undimmed page (the log-out confirm, 31).
   * "handle": a full-width sheet with a grab handle over a dimmed page (owner-v3 03, 04).
   */
  variant?: "close" | "handle";
};

/**
 * A white sheet from the bottom. It closes on a tap outside, on back, and by dragging it down by
 * the handle or anywhere on the sheet (release 1.0.0 part 2): far enough or a flick closes it,
 * otherwise it springs back.
 */
export function BottomSheet({ visible, onClose, children, variant = "close" }: Props) {
  const insets = useSafeAreaInsets();
  const handle = variant === "handle";
  const drag = useSheetDrag(visible, onClose);
  return (
    <Modal
      visible={visible}
      transparent
      animationType={handle ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      {/* Keeps the sheet's fields above the keyboard (the hours day editor). */}
      <KeyboardAvoidingView style={[styles.backdrop, handle && styles.dimmed]} behavior="padding">
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        {handle ? (
          <Animated.View
            style={[styles.handleSheet, { paddingBottom: insets.bottom + 27 }, drag.style]}
            onLayout={drag.onLayout}
            {...drag.sheetHandlers}
          >
            {/* The grip takes a drag from its first touch; the rest of the sheet once it moves. */}
            <View style={styles.gripArea} {...drag.gripHandlers}>
              <View style={styles.grip} />
            </View>
            {children}
          </Animated.View>
        ) : (
          <Animated.View
            style={[styles.sheet, { paddingBottom: insets.bottom + space(6) }, drag.style]}
            onLayout={drag.onLayout}
            {...drag.sheetHandlers}
          >
            <View style={styles.closeGripArea} {...drag.gripHandlers} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={8}
              style={styles.close}
            >
              <Feather name="x" size={26} color={colors.ink} />
            </Pressable>
            {children}
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useSheetDrag(visible: boolean, onClose: () => void) {
  const offset = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  const close = useRef(onClose);
  close.current = onClose;

  // Each opening starts at rest.
  useEffect(() => {
    if (visible) offset.setValue(0);
  }, [visible, offset]);

  return useMemo(() => {
    const springBack = () =>
      Animated.spring(offset, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const handlers = {
      onPanResponderMove: (_: unknown, g: { dy: number }) => offset.setValue(sheetOffset(g.dy)),
      onPanResponderRelease: (_: unknown, g: { dy: number; vy: number }) => {
        if (!closesSheet(g.dy, g.vy, height.current)) return springBack();
        Animated.timing(offset, {
          toValue: Math.max(height.current, 300),
          duration: 180,
          useNativeDriver: true,
        }).start(() => close.current());
      },
      onPanResponderTerminate: springBack,
      // Once the sheet is moving, a scroll view inside may not take the gesture back.
      onPanResponderTerminationRequest: () => false,
    };
    const sheet = PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => startsSheetDrag(g.dx, g.dy),
      ...handlers,
    });
    const grip = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      ...handlers,
    });
    return {
      style: { transform: [{ translateY: offset }] },
      onLayout: (e: { nativeEvent: { layout: { height: number } } }) => {
        height.current = e.nativeEvent.layout.height;
      },
      sheetHandlers: sheet.panHandlers,
      gripHandlers: grip.panHandlers,
    };
  }, [offset]);
}

const styles = StyleSheet.create({
  // Design 31 keeps the page undimmed; a soft shadow lifts the sheet instead.
  backdrop: { flex: 1, justifyContent: "flex-end" },
  dimmed: { backgroundColor: colors.scrim },
  sheet: {
    marginHorizontal: 12,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: space(14),
    gap: space(6),
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  close: {
    position: "absolute",
    top: space(3),
    right: space(4),
    width: minTouch,
    height: minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  handleSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  // A taller touch area around the 4 pt grip; the grip itself keeps its place (owner-v3 03).
  gripArea: { alignSelf: "stretch", alignItems: "center", paddingTop: 10, marginTop: -10 },
  grip: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.field,
    marginBottom: 16,
  },
  // The close variant has no visible grip: its top strip, left of the ×, takes the drag.
  closeGripArea: { position: "absolute", top: 0, left: 0, right: minTouch + space(4), height: space(12) },
});
