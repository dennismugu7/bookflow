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
};

/** Selectable pill; the selected state is announced to screen readers, not shown by colour alone. */
export function Chip({ label, selected, onPress, compact = false, role = "checkbox" }: Props) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      hitSlop={compact ? (minTouch - COMPACT) / 2 : undefined}
      style={[styles.chip, compact && styles.compact, selected ? styles.selected : styles.idle]}
    >
      <Text
        style={[
          styles.text,
          compact && styles.compactText,
          { color: selected ? colors.action : colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const COMPACT = 37;

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
