import { ScrollView, StyleSheet, View } from "react-native";

import { dayOptions, whenTimes } from "../lib/new-booking";
import { Chip } from "./Chip";

/**
 * The day chips (today and the next two weeks) and 15-minute time chips of the When picker
 * (owner-v3 05), shared by New booking and Reschedule. `futureOnly` leaves out times already past.
 */
export function WhenChips({
  timeZone,
  date,
  time,
  onPick,
  futureOnly = false,
}: {
  timeZone: string;
  date: string;
  time: string;
  onPick: (date: string, time: string) => void;
  futureOnly?: boolean;
}) {
  const now = new Date();
  const days = dayOptions(now, timeZone);
  const times = whenTimes(time, futureOnly ? { date, timeZone, after: now } : undefined);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.days}>
        <View style={styles.dayRow}>
          {days.map((d) => (
            <Chip
              key={d.date}
              label={d.label}
              role="radio"
              compact
              selected={d.date === date}
              onPress={() => onPick(d.date, time)}
            />
          ))}
        </View>
      </ScrollView>
      <ScrollView style={styles.times}>
        <View style={styles.chips}>
          {times.map((t) => (
            <Chip
              key={t}
              label={t}
              role="radio"
              compact
              selected={t === time}
              onPress={() => onPick(date, t)}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  days: { marginTop: 14, flexGrow: 0 },
  dayRow: { flexDirection: "row", gap: 9 },
  times: { marginTop: 14, maxHeight: 220 },
  chips: { flexDirection: "row", flexWrap: "wrap", columnGap: 9, rowGap: 9 },
});
