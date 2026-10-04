import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet } from "react-native";

import { colors } from "../theme";

type Props = { label: string; onPress: () => void };

/** The one round blue "+" add button, the same on every add screen (owner-v2 02, 04). */
export function Fab({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Feather name="plus" size={32} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
    // A soft blue glow, as in the mockups.
    shadowColor: colors.action,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pressed: { opacity: 0.85 },
});
