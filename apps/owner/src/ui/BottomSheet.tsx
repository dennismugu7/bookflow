import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, minTouch, space } from "../theme";

type Props = { visible: boolean; onClose: () => void; children: ReactNode };

/** A white sheet from the bottom with a close ×, as in the log-out confirm (31). */
export function BottomSheet({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Design 31 keeps the page undimmed; a soft shadow lifts the sheet instead.
  backdrop: { flex: 1, justifyContent: "flex-end" },
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
});
