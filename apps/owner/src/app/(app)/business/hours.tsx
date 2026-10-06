import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  addBreak,
  applyDayDraft,
  dayDraft,
  dayDraftError,
  weekdayIn,
  type DayDraft,
} from "../../../lib/display";
import { useSession } from "../../../lib/session";
import { WEEKDAYS, describeDay, rowsToWeek, weekToRows, type Week } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, type } from "../../../theme";
import { BottomSheet, Button, Page, TextField } from "../../../ui";
import { showToast } from "../../../lib/toast";

const dayName = (day: number) => WEEKDAYS.find((d) => d.day === day)?.name ?? "";

/** Opening hours: a row per day, and a small editor for the day you tap (owner-v2 05). */
export default function HoursScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const timeZone = membership?.salon.timezone ?? "Africa/Nairobi";
  const [week, setWeek] = useState<Week>();
  const [loadError, setLoadError] = useState<string>();
  const [editing, setEditing] = useState<{ day: number; draft: DayDraft }>();
  const [dayError, setDayError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("opening_hours")
      .select("weekday, opens, closes")
      .eq("salon_id", salonId)
      .then(({ data, error }) => {
        if (error) setLoadError("Couldn't load your hours. Go back and try again.");
        else setWeek(rowsToWeek(data ?? []));
      });
  }, [salonId]);

  function open(day: number) {
    if (!week) return;
    setEditing({ day, draft: dayDraft(week[day] ?? []) });
    setDayError(undefined);
  }

  function change(draft: DayDraft) {
    setEditing((e) => (e ? { ...e, draft } : e));
    setDayError(undefined);
  }

  async function save() {
    if (!week || !editing || !salonId || saving) return;
    const problem = dayDraftError(week, editing.day, editing.draft);
    if (problem) {
      setDayError(problem);
      return;
    }
    // set_opening_hours replaces the whole week in one transaction.
    const rows = weekToRows(applyDayDraft(week, editing.day, editing.draft));
    setSaving(true);
    const { error } = await getSupabase().rpc("set_opening_hours", {
      p_salon_id: salonId,
      p_hours: rows,
    });
    setSaving(false);
    if (error) {
      setDayError(
        error.code === "BF400"
          ? error.message
          : "Couldn't save. Check your connection and try again.",
      );
      return;
    }
    setWeek(rowsToWeek(rows));
    setEditing(undefined);
    showToast();
  }

  const today = weekdayIn(timeZone);
  const draft = editing?.draft;

  return (
    <Page title="Opening hours" gap={0} padding={20}>
      <Text style={styles.hint}>Tap a day to change it. Today is in bold.</Text>
      {week
        ? WEEKDAYS.map(({ day, name }) => {
            const ranges = week[day] ?? [];
            const closed = ranges.length === 0;
            const bold = day === today ? styles.today : null;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`${name}${day === today ? ", today" : ""}: ${describeDay(ranges)}. Change`}
                onPress={() => open(day)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={[styles.dot, closed && styles.dotClosed]} />
                <Text style={[styles.day, bold]}>{name}</Text>
                <Text
                  style={[styles.hours, closed && styles.closed, bold]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {describeDay(ranges)}
                </Text>
                <Feather name="chevron-right" size={20} color={colors.faint} />
              </Pressable>
            );
          })
        : null}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      <BottomSheet visible={!!editing} onClose={() => setEditing(undefined)}>
        {editing && draft ? (
          <>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {dayName(editing.day)}
            </Text>
            <View style={styles.closedRow}>
              <Text style={styles.closedLabel}>Closed</Text>
              <Switch
                accessibilityLabel="Closed"
                value={draft.closed}
                onValueChange={(closed) => change({ ...draft, closed })}
                trackColor={{ false: colors.field, true: colors.action }}
                thumbColor={colors.white}
              />
            </View>
            {draft.closed ? null : (
              <View style={styles.ranges}>
                {draft.ranges.map((range, index) => (
                  <View key={index} style={styles.range}>
                    <View style={styles.flex}>
                      <TextField
                        label="Opens"
                        placeholder="09:00"
                        value={range.opens}
                        onChangeText={(opens) =>
                          change({
                            ...draft,
                            ranges: draft.ranges.map((r, i) => (i === index ? { ...r, opens } : r)),
                          })
                        }
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                    <View style={styles.flex}>
                      <TextField
                        label="Closes"
                        placeholder="18:00"
                        value={range.closes}
                        onChangeText={(closes) =>
                          change({
                            ...draft,
                            ranges: draft.ranges.map((r, i) =>
                              i === index ? { ...r, closes } : r,
                            ),
                          })
                        }
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                    {draft.ranges.length > 1 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${range.opens || "this"} to ${range.closes || "time"}`}
                        onPress={() =>
                          change({ ...draft, ranges: draft.ranges.filter((_, i) => i !== index) })
                        }
                        style={styles.remove}
                      >
                        <Feather name="x" size={20} color={colors.subtle} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add a break"
                  onPress={() => change({ ...draft, ranges: addBreak(draft.ranges) })}
                  style={styles.addBreak}
                >
                  <Feather name="plus" size={18} color={colors.action} />
                  <Text style={styles.addBreakText}>Add a break</Text>
                </Pressable>
              </View>
            )}
            {dayError ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {dayError}
              </Text>
            ) : null}
            <Button title="Save" onPress={() => void save()} loading={saving} />
          </>
        ) : null}
      </BottomSheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.subtle,
    marginTop: -2,
    marginBottom: 4,
  },
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.softFill },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.openDotV2,
    marginRight: 12,
  },
  dotClosed: { backgroundColor: colors.closedDot },
  day: { width: 100, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  hours: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    textAlign: "right",
    marginRight: 14,
  },
  closed: { color: colors.faint },
  today: { fontFamily: fonts.bold },
  error: { ...type.caption, color: colors.danger },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  closedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closedLabel: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  ranges: { gap: 12 },
  range: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  flex: { flex: 1 },
  remove: { width: minTouch, height: 52, alignItems: "center", justifyContent: "center" },
  addBreak: {
    minHeight: minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  addBreakText: { fontFamily: fonts.medium, fontSize: 16, color: colors.action },
});
