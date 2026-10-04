import { formatMinutes } from "@bookflow/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Gap } from "../../lib/agenda";
import { clockTime } from "../../lib/time";
import { colors, fonts } from "../../theme";

type Props = { gap: Gap; timeZone: string; onFill?: () => void };

/** A dashed free-time row, "12:00  2h free  + Fill this slot" (owner-v3 01). */
export function GapRow({ gap, timeZone, onFill }: Props) {
  const time = clockTime(gap.starts_at, timeZone);
  const free = `${formatMinutes(gap.minutes)} free`;
  const content = (
    <>
      <Text style={styles.time}>{time}</Text>
      <Text style={styles.free}>{free}</Text>
      {onFill ? <Text style={styles.fill}>+ Fill this slot</Text> : null}
    </>
  );
  if (!onFill) {
    return (
      <View style={styles.row} accessible accessibilityLabel={`${time}, ${free}`}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${time}, ${free}. Fill this slot`}
      onPress={onFill}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  pressed: { backgroundColor: colors.softFill },
  time: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  free: {
    flex: 1,
    marginLeft: 11,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.subtle,
  },
  fill: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.action },
});
