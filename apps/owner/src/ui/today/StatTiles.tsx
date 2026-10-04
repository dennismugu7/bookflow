import { compactKes, formatMinutes } from "@bookflow/shared";
import { StyleSheet, Text, View } from "react-native";

import type { Agenda } from "../../lib/agenda";
import { colors, fonts } from "../../theme";

/** Booked, Expected KES and Free, the three tiles under the date (owner-v3 01). */
export function StatTiles({ stats }: { stats: Agenda["stats"] }) {
  const tiles = [
    { label: "Booked", value: String(stats.booked) },
    { label: "Expected KES", value: compactKes(stats.expected_kes) },
    { label: "Free", value: formatMinutes(stats.free_min) },
  ];
  return (
    <View style={styles.row}>
      {tiles.map((tile) => (
        <View
          key={tile.label}
          style={styles.tile}
          accessible
          accessibilityLabel={`${tile.label}: ${tile.value}`}
        >
          <Text style={styles.label}>{tile.label}</Text>
          <Text style={styles.value}>{tile.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  label: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 19, color: colors.subtle },
  value: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: colors.ink, marginTop: 1 },
});
