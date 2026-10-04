import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { firstName, type AgendaBooking } from "../../lib/agenda";
import { clockTime, shortDate } from "../../lib/time";
import { colors, fonts } from "../../theme";
import { BottomSheet } from "../BottomSheet";
import { Chip } from "../Chip";
import { TextField } from "../TextField";

const REASONS = ["Client asked", "I'm unavailable", "Other"] as const;
type Reason = (typeof REASONS)[number];

type SheetProps = {
  booking: AgendaBooking | undefined;
  timeZone: string;
  onClose: () => void;
  saving: boolean;
  error?: string;
};

const clientFirstName = (booking: AgendaBooking) =>
  booking.client ? firstName(booking.client.full_name) : "this client";

/** Cancel, from ⋯ (owner-v3 03): an optional reason, then Keep booking or a red Cancel booking. */
export function CancelSheet({
  booking,
  timeZone,
  onClose,
  saving,
  error,
  onConfirm,
}: SheetProps & { onConfirm: (reason: string | null) => void }) {
  const [reason, setReason] = useState<Reason | null>("Client asked");
  const [other, setOther] = useState("");

  // Each booking starts from the mockup's default.
  useEffect(() => {
    setReason("Client asked");
    setOther("");
  }, [booking?.id]);

  if (!booking) return null;
  const name = clientFirstName(booking);
  const when = `${shortDate(booking.starts_at, timeZone)}, ${clockTime(booking.starts_at, timeZone)}`;
  const services = booking.services.map((s) => s.name).join(", ");
  const chosen = reason === "Other" ? other.trim() || null : reason;

  return (
    <BottomSheet visible onClose={onClose} variant="handle">
      <Text style={styles.title} accessibilityRole="header">
        Cancel {booking.client ? `${name}'s` : "this"} booking?
      </Text>
      <Text style={styles.sub}>
        {when} · {services}
      </Text>
      <Text style={styles.label}>Reason (optional)</Text>
      <View style={styles.chips}>
        {REASONS.map((r) => (
          <Chip
            key={r}
            label={r}
            role="radio"
            compact
            selected={reason === r}
            onPress={() => setReason((current) => (current === r ? null : r))}
          />
        ))}
      </View>
      {reason === "Other" ? (
        <View style={styles.other}>
          <TextField
            label="Reason"
            hideLabel
            placeholder="Type the reason"
            value={other}
            onChangeText={setOther}
            maxLength={200}
            autoFocus
          />
        </View>
      ) : null}
      <Text style={styles.hint}>
        {booking.source === "web" ? `${name} will see it as cancelled in their bookings. ` : ""}
        This can't be undone.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttons}>
        <SheetButton label="Keep booking" onPress={onClose} />
        <SheetButton
          label="Cancel booking"
          tone="danger"
          loading={saving}
          onPress={() => onConfirm(chosen)}
        />
      </View>
    </BottomSheet>
  );
}

/** No-show, once the start time has passed (owner-v3 04). */
export function NoShowSheet({
  booking,
  onClose,
  saving,
  error,
  onConfirm,
}: SheetProps & { onConfirm: () => void }) {
  if (!booking) return null;
  return (
    <BottomSheet visible onClose={onClose} variant="handle">
      <Text style={styles.title} accessibilityRole="header">
        Mark {clientFirstName(booking)} as a no-show?
      </Text>
      <Text style={styles.body}>
        It's recorded on their client profile. Repeated no-shows will show up when you see their
        bookings.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={[styles.buttons, styles.noShowButtons]}>
        <SheetButton label="Go back" onPress={onClose} />
        <SheetButton label="Mark no-show" tone="attention" loading={saving} onPress={onConfirm} />
      </View>
    </BottomSheet>
  );
}

const TONES = {
  plain: { background: colors.white, border: colors.cardLine, text: colors.ink },
  danger: { background: colors.danger, border: colors.danger, text: colors.white },
  attention: { background: colors.attention, border: colors.attention, text: colors.ink },
};

function SheetButton({
  label,
  onPress,
  tone = "plain",
  loading = false,
}: {
  label: string;
  onPress: () => void;
  tone?: keyof typeof TONES;
  loading?: boolean;
}) {
  const t = TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: t.background, borderColor: t.border },
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.text} />
      ) : (
        <Text style={[styles.buttonText, { color: t.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  sub: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 20,
    color: colors.subtle,
  },
  label: {
    marginTop: 12,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.ink,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 9 },
  other: { marginTop: 12 },
  hint: {
    marginTop: 15,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 15,
    color: colors.subtle,
  },
  body: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 19,
    color: colors.subtle,
  },
  error: { marginTop: 10, fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  buttons: { flexDirection: "row", gap: 10, marginTop: 14 },
  noShowButtons: { marginTop: 18 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontFamily: fonts.medium, fontSize: 15 },
  pressed: { opacity: 0.85 },
});
