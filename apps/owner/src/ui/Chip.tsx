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
      <Text style={[styles.text, { color: selected ? colors.action : colors.ink }]}>{label}</Text>
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
  // Same look as the duration chips (owner-v2 03).
  idle: { backgroundColor: colors.white, borderColor: colors.field },
  selected: {
    backgroundColor: colors.actionTint,
    borderColor: colors.action,
    borderWidth: 2,
    paddingHorizontal: space(4) - 1,
  },
  text: { fontFamily: fonts.regular, fontSize: 16 },
});
