import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, minTouch, space } from "../theme";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 37 px high, as in the owner-v3 sheets and New booking; the touch area stays 44 px. */
  compact?: boolean;
  /** "radio" when only one can be picked. */
  role?: "checkbox" | "radio";
  /** 32 px high, as the filters of the Calendar week and the client list (owner-v4 02, 04). */
  dense?: boolean;
};

/** Selectable pill; the selected state is announced to screen readers, not shown by colour alone. */
export function Chip({
  label,
  selected,
  onPress,
  compact = false,
  role = "checkbox",
  dense = false,
}: Props) {
  const height = dense ? DENSE : compact ? COMPACT : minTouch;
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      hitSlop={height < minTouch ? (minTouch - height) / 2 : undefined}
      style={[
        styles.chip,
        compact && styles.compact,
        dense && styles.dense,
        selected ? styles.selected : styles.idle,
      ]}
    >
      <Text
        style={[
          styles.text,
          compact && styles.compactText,
          dense && styles.denseText,
          { color: selected ? colors.action : colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const COMPACT = 37;
const DENSE = 32;

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouch,
    paddingHorizontal: space(4),
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { minHeight: COMPACT },
  compactText: { fontSize: 14 },
  dense: { minHeight: DENSE, paddingHorizontal: 15 },
  denseText: { fontSize: 15 },
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
