import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useSession } from "../../../lib/session";
import { WEEKDAYS, rowsToWeek, validateWeek, weekToRows, type Week } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, controlHeight, fonts, minTouch, radius, space, type } from "../../../theme";
import { Button, Header, Screen } from "../../../ui";

const DEFAULT_RANGE = { opens: "09:00", closes: "18:00" };

export default function HoursScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [week, setWeek] = useState<Week>();
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("opening_hours")
      .select("weekday, opens, closes")
      .eq("salon_id", salonId)
      .then(({ data, error }) => {
        if (error) setFormError("Couldn't load your hours. Go back and try again.");
        else setWeek(rowsToWeek(data ?? []));
      });
  }, [salonId]);

  function update(day: number, ranges: Week[number]) {
    if (!week) return;
    setWeek({ ...week, [day]: ranges });
    setErrors((e) => {
      const { [day]: _removed, ...rest } = e;
      return rest;
    });
  }

  async function save() {
    if (!week || !salonId) return;
    const dayErrors = validateWeek(week);
    setErrors(dayErrors);
    if (Object.keys(dayErrors).length > 0) return;
    setSaving(true);
    setFormError(undefined);
    const { error } = await getSupabase().rpc("set_opening_hours", {
      p_salon_id: salonId,
      p_hours: weekToRows(week),
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
    router.back();
  }

  return (
    <Screen
      footer={
        <Button title="Save hours" onPress={() => void save()} loading={saving} disabled={!week} />
      }
    >
      <Header title="Opening hours" subtitle="Clients can only book inside these times" />
      {week
        ? WEEKDAYS.map(({ day, name }) => {
            const ranges = week[day] ?? [];
            const open = ranges.length > 0;
            return (
              <View key={day} style={styles.day}>
                <View style={styles.dayHeader}>
                  <Text style={[type.bodyStrong, styles.dayName]}>{name}</Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {open ? "Open" : "Closed"}
                  </Text>
                  <Switch
                    accessibilityLabel={`${name} open`}
                    value={open}
                    onValueChange={(on) => update(day, on ? [DEFAULT_RANGE] : [])}
                    trackColor={{ false: colors.border, true: colors.select }}
                    thumbColor={colors.white}
                  />
                </View>
                {ranges.map((range, index) => (
                  <View key={index} style={styles.range}>
                    <TimeInput
                      label={`${name} opens`}
                      value={range.opens}
                      onChange={(opens) =>
                        update(
                          day,
                          ranges.map((r, i) => (i === index ? { ...r, opens } : r)),
                        )
                      }
                    />
                    <Text style={type.body}>–</Text>
                    <TimeInput
                      label={`${name} closes`}
                      value={range.closes}
                      onChange={(closes) =>
                        update(
                          day,
                          ranges.map((r, i) => (i === index ? { ...r, closes } : r)),
                        )
                      }
                    />
                    {ranges.length > 1 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${name} range ${index + 1}`}
                        onPress={() =>
                          update(
                            day,
                            ranges.filter((_, i) => i !== index),
                          )
                        }
                        style={styles.icon}
                      >
                        <Feather name="x" size={20} color={colors.muted} />
                      </Pressable>
                    ) : (
                      <View style={styles.icon} />
                    )}
                  </View>
                ))}
                {open ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add a break on ${name}`}
                    onPress={() => update(day, [...ranges, { opens: "", closes: "" }])}
                    style={styles.add}
                  >
                    <Text style={styles.addText}>+ Add another range</Text>
                  </Pressable>
                ) : null}
                {errors[day] ? <Text style={styles.error}>{errors[day]}</Text> : null}
              </View>
            );
          })
        : null}
      <Text style={[type.caption, { color: colors.muted }]}>
        Use 24:00 if you close at midnight.
      </Text>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
    </Screen>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChange}
      placeholder="09:00"
      placeholderTextColor={colors.muted}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      style={styles.time}
    />
  );
}

const styles = StyleSheet.create({
  day: {
    gap: space(2),
    paddingBottom: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: space(3), minHeight: minTouch },
  dayName: { flex: 1 },
  range: { flexDirection: "row", alignItems: "center", gap: space(2) },
  time: {
    flex: 1,
    height: controlHeight,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space(4),
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    textAlign: "center",
  },
  icon: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  add: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  addText: { fontFamily: fonts.bold, fontSize: 14, color: colors.brand },
  error: { ...type.caption, color: colors.danger },
});
