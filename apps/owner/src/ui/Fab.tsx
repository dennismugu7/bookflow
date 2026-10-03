import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet } from "react-native";

import { colors } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  /** "teal" on My services (47, 49), "blue" on My team (50, 52). */
  tone?: "teal" | "blue";
  size?: number;
};

/** The round "+" add button. */
export function Fab({ label, onPress, tone = "blue", size = 58 }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone === "teal" ? colors.fabTeal : colors.fabBlue,
        },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        name={tone === "teal" ? "plus-thick" : "plus"}
        size={size * 0.55}
        color={colors.white}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pressed: { opacity: 0.85 },
});
