import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  hourRowsToWeek,
  hoursLabel,
  validateHourRows,
  weekToHourRows,
  weekdayIn,
  type HourRow,
} from "../../../lib/display";
import { useSession } from "../../../lib/session";
import { WEEKDAYS, rowsToWeek, weekToRows, type Week } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../theme";
import { BottomSheet, CardScreen, CardSubtitle, CardTitle } from "../../../ui";

const BLANK: HourRow = { day: null, opens: "", closes: "" };
const dayName = (day: number) => WEEKDAYS.find((d) => d.day === day)?.name ?? "";

/** Opening hours: view (57) and edit (56). */
export default function HoursScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const timeZone = membership?.salon.timezone ?? "Africa/Nairobi";
  const [week, setWeek] = useState<Week>();
  const [rows, setRows] = useState<HourRow[]>();
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [pickingDayFor, setPickingDayFor] = useState<number>();

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("opening_hours")
      .select("weekday, opens, closes")
      .eq("salon_id", salonId)
      .then(({ data, error }) => {
        if (error) {
          setFormError("Couldn't load your hours. Go back and try again.");
          return;
        }
        const loaded = rowsToWeek(data ?? []);
        setWeek(loaded);
        // With no hours yet, start in the editor with one blank line (56).
        if ((data ?? []).length === 0) setRows([BLANK]);
      });
  }, [salonId]);

  function edit(addLine = false) {
    if (!week) return;
    const current = weekToHourRows(week);
    setRows(addLine || current.length === 0 ? [...current, BLANK] : current);
    setErrors({});
    setFormError(undefined);
  }

  function update(index: number, change: Partial<HourRow>) {
    setRows((all) => all?.map((row, i) => (i === index ? { ...row, ...change } : row)));
    setErrors((e) => {
      const { [index]: _removed, ...rest } = e;
      return rest;
    });
  }

  async function save() {
    if (!rows || !salonId || saving) return;
    const rowErrors = validateHourRows(rows);
    setErrors(rowErrors);
    if (Object.keys(rowErrors).length > 0) return;
    const next = hourRowsToWeek(rows);
    setSaving(true);
    setFormError(undefined);
    const { error } = await getSupabase().rpc("set_opening_hours", {
      p_salon_id: salonId,
      p_hours: weekToRows(next),
    });
    setSaving(false);
    if (error) {
      setFormError(
        error.code === "BF400"
          ? error.message
          : "Couldn't save. Check your connection and try again.",
      );
      return;
    }
    setWeek(rowsToWeek(weekToRows(next)));
    setRows(undefined);
  }

  if (rows) {
    const hasSaved = !!week && weekToHourRows(week).length > 0;
    return (
      <CardScreen
        left={
          hasSaved
            ? { icon: "arrow-left", label: "Cancel editing", onPress: () => setRows(undefined) }
            : { icon: "arrow-left", label: "Back", onPress: () => router.back() }
        }
        right={{
          icon: "check",
          label: saving ? "Saving" : "Save hours",
          onPress: () => void save(),
        }}
      >
        <View style={styles.heading}>
          <CardTitle>Opening hours</CardTitle>
          <CardSubtitle>
            Let your clients know when you&apos;re open and ready to serve them.
          </CardSubtitle>
        </View>
        <Text style={styles.label}>Opening times</Text>
        {rows.map((row, index) => (
          <View key={index} style={styles.rowGroup}>
            <View style={[styles.line, errors[index] ? styles.lineInvalid : null]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={row.day ? `Day, ${dayName(row.day)}` : "Pick a day"}
                onPress={() => setPickingDayFor(index)}
                style={styles.day}
              >
                <Text style={row.day ? styles.value : styles.placeholder} numberOfLines={1}>
                  {row.day ? dayName(row.day) : "Day"}
                </Text>
              </Pressable>
              <Text style={styles.placeholder}>:</Text>
              <TextInput
                accessibilityLabel={`${row.day ? dayName(row.day) : "Line " + (index + 1)} opens`}
                value={row.opens}
                onChangeText={(opens) => update(index, { opens })}
                placeholder="Open time"
                placeholderTextColor={colors.placeholder}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={styles.time}
              />
              <Text style={styles.placeholder}>-</Text>
              <TextInput
                accessibilityLabel={`${row.day ? dayName(row.day) : "Line " + (index + 1)} closes`}
                value={row.closes}
                onChangeText={(closes) => update(index, { closes })}
                placeholder="Close time"
                placeholderTextColor={colors.placeholder}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={styles.time}
              />
              {rows.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove line ${index + 1}`}
                  onPress={() => {
                    setRows(rows.filter((_, i) => i !== index));
                    setErrors({});
                  }}
                  style={styles.remove}
                >
                  <Feather name="x" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
            {errors[index] ? <Text style={styles.error}>{errors[index]}</Text> : null}
          </View>
        ))}
        <AddLine onPress={() => setRows([...rows, BLANK])} />
        <Text style={styles.note}>
          Days without a line are closed. Use 24:00 if you close at midnight.
        </Text>
        {saving ? <Text style={styles.note}>Saving…</Text> : null}
        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <BottomSheet
          visible={pickingDayFor !== undefined}
          onClose={() => setPickingDayFor(undefined)}
        >
          <Text style={styles.sheetTitle}>Day</Text>
          <View>
            {WEEKDAYS.map(({ day, name }) => (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={name}
                onPress={() => {
                  if (pickingDayFor !== undefined) update(pickingDayFor, { day });
                  setPickingDayFor(undefined);
                }}
                style={styles.dayOption}
              >
                <Text style={styles.dayOptionText}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </BottomSheet>
      </CardScreen>
    );
  }

  const today = weekdayIn(timeZone);
  return (
    <CardScreen
      right={
        week ? { icon: "edit-2", label: "Edit opening hours", onPress: () => edit() } : undefined
      }
    >
      <CardTitle>Opening hours</CardTitle>
      {week ? (
        <>
          <View style={styles.week}>
            {WEEKDAYS.map(({ day, name }) => {
              const ranges = week[day] ?? [];
              const bold = day === today ? styles.today : null;
              return (
                <View
                  key={day}
                  style={styles.weekRow}
                  accessible
                  accessibilityLabel={`${name}${day === today ? ", today" : ""}: ${hoursLabel(ranges)}`}
                >
                  <View style={[styles.dot, ranges.length === 0 && styles.dotClosed]} />
                  <Text style={[styles.weekDay, bold]}>{name}</Text>
                  <Text style={[styles.weekHours, bold]}>{hoursLabel(ranges)}</Text>
                </View>
              );
            })}
          </View>
          <AddLine onPress={() => edit(true)} />
        </>
      ) : null}
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
    </CardScreen>
  );
}

function AddLine({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add opening times"
      onPress={onPress}
      style={styles.add}
    >
      <Feather name="plus-circle" size={24} color={colors.blue} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space(4), marginBottom: space(2) },
  label: { fontFamily: fonts.bold, fontSize: 15, color: "#3A3A3A", marginLeft: space(1) },
  rowGroup: { gap: space(1) },
  line: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.inputBlue,
    borderRadius: 18,
    paddingLeft: space(3),
    paddingRight: space(1),
    gap: space(1),
  },
  lineInvalid: { borderColor: colors.danger },
  day: { minHeight: 40, justifyContent: "center", width: 68 },
  value: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  placeholder: { fontFamily: fonts.medium, fontSize: 13, color: colors.placeholder },
  time: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 40,
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    textAlign: "center",
  },
  remove: { width: 28, height: minTouch, alignItems: "center", justifyContent: "center" },
  add: {
    alignSelf: "center",
    width: minTouch,
    height: minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { ...type.caption, color: colors.muted, textAlign: "center" },
  error: { ...type.caption, color: colors.danger },
  week: { marginTop: space(8), gap: space(2) + 2, paddingHorizontal: space(2) },
  weekRow: { flexDirection: "row", alignItems: "center", gap: space(2) + 2, minHeight: 14 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.openDot },
  dotClosed: { backgroundColor: "#CFCFCF" },
  weekDay: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: "#222222" },
  weekHours: { fontFamily: fonts.regular, fontSize: 13.5, color: "#222222", textAlign: "right" },
  today: { fontFamily: fonts.bold, color: "#000000" },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  dayOption: {
    minHeight: minTouch + 4,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayOptionText: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
});
