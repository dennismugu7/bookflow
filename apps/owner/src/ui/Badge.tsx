import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, space } from "../theme";

export type BadgeVariant =
  "confirmed" | "held" | "due" | "new" | "unverified" | "completed" | "noShow";

const variants: Record<BadgeVariant, { background: string; text: string; dashed?: boolean }> = {
  confirmed: { background: colors.successTint, text: colors.success },
  held: { background: colors.attentionTint, text: colors.attentionText },
  due: { background: colors.attentionTint, text: colors.attentionText },
  new: { background: colors.brandTint, text: colors.brand },
  unverified: { background: colors.surface, text: colors.muted, dashed: true },
  completed: { background: colors.surface, text: colors.muted },
  noShow: { background: colors.dangerTint, text: colors.danger },
};

/** Status is always text plus colour; unverified phones get a dashed outline. */
export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const v = variants[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.background }, v.dashed && styles.dashed]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
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
  dashed: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderStrong },
  text: { fontFamily: fonts.bold, fontSize: 13 },
});
