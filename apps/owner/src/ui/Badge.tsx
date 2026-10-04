import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, space } from "../theme";

export type BadgeVariant =
  | "confirmed"
  | "held"
  | "due"
  | "new"
  | "unverified"
  | "completed"
  | "noShow"
  | "done"
  | "next"
  | "newWeb"
  | "lapsed"
  | "missed";

const variants: Record<BadgeVariant, { background: string; text: string; dashed?: boolean }> = {
  confirmed: { background: colors.successTint, text: colors.success },
  held: { background: colors.attentionTint, text: colors.attentionText },
  due: { background: colors.attentionTint, text: colors.attentionText },
  new: { background: colors.brandTint, text: colors.brand },
  // Dashed amber, as on the Today cards (owner-v3 01).
  unverified: { background: colors.attentionSoft, text: colors.attentionInk, dashed: true },
  completed: { background: colors.surface, text: colors.muted },
  noShow: { background: colors.dangerTint, text: colors.danger },
  // Today cards (owner-v3 01).
  done: { background: colors.doneTint, text: colors.success },
  next: { background: colors.actionTint, text: colors.action },
  newWeb: { background: colors.newTint, text: colors.select },
  // Clients (owner-v4 04, 05).
  lapsed: { background: colors.attentionSoft, text: colors.attentionInk },
  missed: { background: colors.missedTint, text: colors.danger },
};

type Props = {
  label: string;
  variant: BadgeVariant;
  /** "small": the 21 px badges of the Today cards (owner-v3 01). */
  size?: "default" | "small";
};

/** Status is always text plus colour; unverified phones get a dashed outline. */
export function Badge({ label, variant, size = "default" }: Props) {
  const v = variants[variant];
  const small = size === "small";
  return (
    <View
      style={[
        styles.badge,
        small && styles.small,
        { backgroundColor: v.background },
        v.dashed && styles.dashed,
      ]}
    >
      <Text style={[styles.text, small && styles.smallText, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
  },
  small: { paddingHorizontal: 7, paddingVertical: 3 },
  dashed: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.attention },
  text: { fontFamily: fonts.bold, fontSize: 13 },
  smallText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
});
