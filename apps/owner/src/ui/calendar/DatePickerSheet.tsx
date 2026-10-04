import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { monthGrid, monthLabel, shiftMonth } from "../../lib/calendar";
import { colors, fonts, minTouch } from "../../theme";
import { BottomSheet } from "../BottomSheet";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** A month to pick a day from; opened from the Calendar's date label. */
export function DatePickerSheet({
  visible,
  value,
  today,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string;
  today: string;
  onClose: () => void;
  onPick: (date: string) => void;
}) {
  const [month, setMonth] = useState(value);
  useEffect(() => {
    if (visible) setMonth(value);
  }, [visible, value]);

  const pick = (date: string) => {
    onPick(date);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} variant="handle">
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
          style={styles.arrow}
        >
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {monthLabel(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
          style={styles.arrow}
        >
          <Feather name="chevron-right" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {monthGrid(month).map((week, w) => (
        <View key={w} style={styles.row}>
          {week.map((date, i) =>
            date ? (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={date}
                accessibilityState={{ selected: date === value }}
                onPress={() => pick(date)}
                style={styles.cell}
              >
                <View style={[styles.dayCircle, date === value && styles.selected]}>
                  <Text
                    style={[
                      styles.day,
                      date === today && styles.today,
                      date === value && styles.selectedText,
                    ]}
                  >
                    {Number(date.slice(8, 10))}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View key={`blank-${i}`} style={styles.cell} />
            ),
          )}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to today"
        onPress={() => pick(today)}
        style={({ pressed }) => [styles.todayButton, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.todayButtonText}>Today</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  row: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 28,
    color: colors.subtle,
  },
  cell: { flex: 1, height: minTouch, alignItems: "center", justifyContent: "center" },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.ink },
  day: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  today: { color: colors.action, fontFamily: fonts.bold },
  selectedText: { color: colors.white },
  todayButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    alignItems: "center",
    justifyContent: "center",
  },
  todayButtonText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
});
