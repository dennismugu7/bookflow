import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

/** A white sheet from the bottom. */
export function BottomSheet({ visible, onClose, children, variant = "close" }: Props) {
  const insets = useSafeAreaInsets();
  const handle = variant === "handle";
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
          <View style={[styles.handleSheet, { paddingBottom: insets.bottom + 27 }]}>
            <View style={styles.grip} />
            {children}
          </View>
        ) : (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space(6) }]}>
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
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
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
  grip: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.field,
    marginBottom: 16,
  },
});
