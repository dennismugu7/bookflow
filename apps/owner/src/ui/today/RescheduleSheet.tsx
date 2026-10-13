import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { firstName, type AgendaBooking } from "../../lib/agenda";
import { whenLabel, withinOpeningHours, type HoursRow } from "../../lib/new-booking";
import { useSession } from "../../lib/session";
import { getSupabase } from "../../lib/supabase";
import { zonedParts, zonedTime } from "../../lib/time";
import { colors, fonts } from "../../theme";
import { BottomSheet } from "../BottomSheet";
import { WhenChips } from "../WhenChips";

/**
 * Reschedule (QA 8663, S-01): New booking's When chips for a new start; same professional,
 * services and length. Outside opening hours it asks first, as New booking does. Errors stay in
 * the sheet.
 */
export function RescheduleSheet({
  booking,
  timeZone,
  onClose,
  saving,
  error,
  onConfirm,
}: {
  booking: AgendaBooking | undefined;
  timeZone: string;
  onClose: () => void;
  saving: boolean;
  error?: string;
  onConfirm: (start: Date) => void;
}) {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [confirmOutside, setConfirmOutside] = useState(false);
  const bookingId = booking?.id;
  const startsAt = booking?.starts_at;

  // Each booking starts from its own time.
  useEffect(() => {
    if (!startsAt) return;
    const current = zonedParts(new Date(startsAt), timeZone);
    setDate(current.date);
    setTime(current.time);
    setConfirmOutside(false);
  }, [bookingId, startsAt, timeZone]);

  // Opening hours for the warning, loaded as New booking does.
  useEffect(() => {
    if (!bookingId || !salonId) return;
    void getSupabase()
      .from("opening_hours")
      .select("weekday, opens, closes")
      .eq("salon_id", salonId)
      .then(({ data }) => setHours(data ?? []));
  }, [bookingId, salonId]);

  if (!booking || !date) return null;
  const current = new Date(booking.starts_at);
  const minutes = Math.round((Date.parse(booking.ends_at) - current.getTime()) / 60_000);
  const start = zonedTime(date, time, timeZone);
  const changed = start.getTime() !== current.getTime();
  const who = booking.client ? firstName(booking.client.full_name) : "the client";

  function move(outsideConfirmed = false) {
    if (!outsideConfirmed && !withinOpeningHours(hours, start, minutes, timeZone)) {
      setConfirmOutside(true);
      return;
    }
    setConfirmOutside(false);
    onConfirm(start);
  }

  if (confirmOutside) {
    return (
      <BottomSheet visible onClose={() => setConfirmOutside(false)} variant="handle">
        <Text style={styles.title} accessibilityRole="header">
          Outside opening hours
        </Text>
        <Text style={styles.body}>
          {whenLabel(start, minutes, timeZone)} is outside your opening hours. Move it anyway?
        </Text>
        <View style={styles.buttons}>
          <SheetButton label="Go back" onPress={() => setConfirmOutside(false)} />
          <SheetButton label="Move anyway" dark onPress={() => move(true)} />
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible onClose={onClose} variant="handle">
      <Text style={styles.title} accessibilityRole="header">
        Reschedule
      </Text>
      <Text style={styles.body}>{whenLabel(current, minutes, timeZone)}</Text>
      <WhenChips
        timeZone={timeZone}
        date={date}
        time={time}
        futureOnly
        onPick={(d, t) => {
          setDate(d);
          setTime(t);
        }}
      />
      <Text style={styles.hint}>Let {who} know the new time.</Text>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        <SheetButton label="Go back" onPress={onClose} />
        <SheetButton
          label="Move booking"
          dark
          loading={saving}
          disabled={!changed}
          onPress={() => move()}
        />
      </View>
    </BottomSheet>
  );
}

/** New booking's sheet buttons, with a busy and a disabled state. */
function SheetButton({
  label,
  onPress,
  dark = false,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  dark?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        dark && styles.buttonDark,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={dark ? colors.white : colors.ink} />
      ) : (
        <Text style={[styles.buttonText, dark && { color: colors.white }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// Title, body and buttons as New booking's sheets (booking/new.tsx).
const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  body: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    color: colors.subtle,
  },
  hint: { marginTop: 12, fontFamily: fonts.regular, fontSize: 13, color: colors.subtle },
  error: { marginTop: 10, fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  buttons: { flexDirection: "row", gap: 10, marginTop: 18 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDark: { backgroundColor: colors.primary, borderColor: colors.primary },
  buttonText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
