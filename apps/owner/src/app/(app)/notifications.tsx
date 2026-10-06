import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  PREF_ROWS,
  PREFS_LOAD_ERROR,
  PREFS_SAVE_ERROR,
  prefsArgs,
  prefsSchema,
  type NotificationPrefs,
  type PhonePermission,
  type PrefKey,
} from "../../lib/notification-prefs";
import { askPhonePermission, getPhonePermission, registerThisPhone } from "../../lib/push";
import { getSupabase } from "../../lib/supabase";
import { colors, fonts, type } from "../../theme";
import { Button, Page } from "../../ui";
import { showToast } from "../../lib/toast";

/** Menu → Notifications (owner-v5 05): three switches, saved for this person straight away. */
export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>();
  const [error, setError] = useState<string>();
  const [permission, setPermission] = useState<PhonePermission>();

  useEffect(() => {
    void getSupabase()
      .rpc("get_notification_prefs")
      .then(({ data, error: loadError }) => {
        const parsed = prefsSchema.safeParse(data);
        if (loadError || !parsed.success) setError(PREFS_LOAD_ERROR);
        else setPrefs(parsed.data);
      });
  }, []);

  // Check again on return from the phone's settings.
  const refreshPermission = useCallback(() => {
    void getPhonePermission().then(setPermission);
  }, []);
  useFocusEffect(refreshPermission);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => sub.remove();
  }, [refreshPermission]);

  async function toggle(key: PrefKey) {
    if (!prefs) return;
    const before = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setError(undefined);
    const { data, error: saveError } = await getSupabase().rpc(
      "set_notification_prefs",
      prefsArgs(next),
    );
    const parsed = prefsSchema.safeParse(data);
    if (saveError || !parsed.success) {
      setPrefs(before);
      setError(PREFS_SAVE_ERROR);
      return;
    }
    showToast();
  }

  async function turnOn() {
    const result = await askPhonePermission();
    setPermission(result);
    if (result === "granted") await registerThisPhone();
  }

  return (
    <Page title="Notifications" padding={0} gap={0}>
      <View style={styles.list}>
        {PREF_ROWS.map((row) => (
          <View key={row.key} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowDetail}>{row.detail}</Text>
            </View>
            <Toggle
              label={row.title}
              value={prefs?.[row.key] ?? false}
              disabled={!prefs}
              onPress={() => void toggle(row.key)}
            />
          </View>
        ))}
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        {permission === "blocked" ? (
          <Text style={styles.note}>
            Notifications are off on this phone?{" "}
            <Text
              accessibilityRole="link"
              style={styles.link}
              onPress={() => void Linking.openSettings()}
            >
              Open phone settings
            </Text>
          </Text>
        ) : permission === "can-ask" ? (
          <View style={styles.turnOn}>
            <Button title="Turn on notifications" variant="action" onPress={() => void turnOn()} />
          </View>
        ) : null}
      </View>
    </Page>
  );
}

/** The switch of 05: a 46 × 28 track, blue when on, with a white 22 px knob. */
function Toggle({
  label,
  value,
  disabled,
  onPress,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.track, value && styles.trackOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

// Sizes from owner-v5 05 at 390 pt.
const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingTop: 8 },
  row: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowText: { flex: 1, paddingTop: 2 },
  rowTitle: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22, color: colors.ink },
  rowDetail: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.subtle },
  track: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    backgroundColor: colors.closedDot,
    justifyContent: "center",
  },
  trackOn: { backgroundColor: colors.action },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  knobOn: { alignSelf: "flex-end" },
  error: { ...type.caption, color: colors.danger, marginTop: 14 },
  note: {
    marginTop: 15,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtle,
  },
  link: { fontFamily: fonts.semibold, color: colors.action },
  turnOn: { marginTop: 20 },
});
