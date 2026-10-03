import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTouch, space, type } from "../theme";

type Props = {
  title: string;
  detail?: string;
  /** Shown on the right before the chevron, e.g. a badge or a price. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Overrides the default label of "title, detail". */
  accessibilityLabel?: string;
};

export function ListRow({ title, detail, trailing, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, detail].filter(Boolean).join(", ")}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={type.bodyStrong}>{title}</Text>
        {detail ? <Text style={[type.caption, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      {trailing}
      {onPress ? <Feather name="chevron-right" size={20} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouch + space(4),
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
});
