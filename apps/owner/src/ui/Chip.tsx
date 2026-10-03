import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, minTouch, space } from "../theme";

type Props = { label: string; selected: boolean; onPress: () => void };

/** Selectable pill; the selected state is announced to screen readers, not shown by colour alone. */
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      <Text style={[styles.text, { color: selected ? colors.brand : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouch,
    paddingHorizontal: space(4),
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  idle: { backgroundColor: colors.white, borderColor: colors.border },
  selected: { backgroundColor: colors.brandTint, borderColor: colors.select, borderWidth: 2 },
  text: { fontFamily: fonts.bold, fontSize: 14 },
});
