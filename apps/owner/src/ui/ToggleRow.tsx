import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, radius, space, type } from "../theme";

type Props = { label: string; detail?: string; value: boolean; onChange: (value: boolean) => void };

/** A bordered row with a label and a switch, as in "Same as salon hours". */
export function ToggleRow({ label, detail, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={type.bodyStrong}>{label}</Text>
        {detail ? <Text style={[type.caption, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.select }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    minHeight: 52,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { flex: 1, gap: 2 },
});
