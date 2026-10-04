import { formatKes, formatMinutes } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  amount,
  badgesFor,
  barTone,
  durationMinutes,
  localPhone,
  serviceLine,
  telLink,
  visitLine,
  whatsappLink,
  type AgendaBooking,
  type CardBadge,
} from "../../lib/agenda";
import { clockTime } from "../../lib/time";
import { colors, fonts } from "../../theme";
import { Badge, type BadgeVariant } from "../Badge";

const BADGES: Record<CardBadge, { label: string; variant: BadgeVariant }> = {
  done: { label: "Done", variant: "done" },
  next: { label: "Next", variant: "next" },
  new: { label: "New · web", variant: "newWeb" },
  noShow: { label: "No-show", variant: "completed" },
  unverified: { label: "Phone not verified", variant: "unverified" },
};

const BAR = { done: colors.success, next: colors.attention, idle: colors.borderStrong };

type Actions = { markDone: boolean; noShow: boolean; cancel: boolean };

type Props = {
  booking: AgendaBooking;
  timeZone: string;
  nextId: string | undefined;
  open: boolean;
  onToggle: () => void;
  actions: Actions;
  onMarkDone: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  /** Mark done is saving. */
  busy?: boolean;
  error?: string;
  /** Opens the client's profile from their name on the opened card. */
  onOpenClient?: (clientId: string) => void;
};

/** One booking on Today (owner-v3 01); tapping it opens contact, details and actions in place (02). */
export function BookingCard(props: Props) {
  const { booking, timeZone, nextId, open, onToggle, onOpenClient } = props;
  const name = booking.client?.full_name ?? "Walk-in";
  const time = clockTime(booking.starts_at, timeZone);
  // The opened card swaps "Next" for the end time (02).
  const badges = badgesFor(booking, nextId).filter((b) => !(open && b === "next"));
  const sub = open
    ? `Ends ${clockTime(booking.ends_at, timeZone)} · with ${booking.staff_name}`
    : serviceLine(booking);

  return (
    <View style={[styles.card, open && styles.open, booking.status === "no_show" && styles.greyed]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${time}, ${name}, ${serviceLine(booking)}, ${amount(booking.total_kes)} shillings`}
        onPress={onToggle}
        style={styles.head}
      >
        <View style={[styles.bar, { backgroundColor: BAR[barTone(booking, nextId)] }]} />
        <View style={styles.when}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.duration}>{formatMinutes(durationMinutes(booking))}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            {open && booking.client && onOpenClient ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${name}'s profile`}
                onPress={() => onOpenClient(booking.client!.id)}
                hitSlop={8}
                style={({ pressed }) => [styles.nameLink, pressed && styles.pressed]}
              >
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
            )}
            <Text style={styles.price}>{amount(booking.total_kes)}</Text>
          </View>
          <Text style={styles.sub} numberOfLines={open ? 1 : 2}>
            {sub}
          </Text>
          {badges.length > 0 ? (
            <View style={styles.badges}>
              {badges.map((b) => (
                <Badge key={b} label={BADGES[b].label} variant={BADGES[b].variant} size="small" />
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
      {open ? <Details {...props} /> : null}
    </View>
  );
}

function Details({ booking, actions, onMarkDone, onNoShow, onCancel, busy, error }: Props) {
  const phone = booking.client?.phone ?? null;
  const started = actions.markDone || actions.noShow;

  return (
    <View style={styles.details}>
      <View style={styles.contact}>
        <Outline
          label="Call"
          icon={<Feather name="phone" size={17} color={colors.ink} />}
          disabled={!phone}
          onPress={() => phone && void Linking.openURL(telLink(phone))}
        />
        <Outline
          label="WhatsApp"
          icon={<FontAwesome name="whatsapp" size={19} color={colors.ink} />}
          disabled={!phone}
          onPress={() => phone && void Linking.openURL(whatsappLink(phone))}
        />
      </View>

      <Text style={styles.sectionLabel}>Services</Text>
      {booking.services.map((s, i) => (
        <View key={`${s.name}-${i}`} style={styles.line}>
          <Text style={styles.lineText}>
            {s.name} · {formatMinutes(s.duration_min)}
          </Text>
          <Text style={styles.lineText}>{amount(s.price_kes)}</Text>
        </View>
      ))}
      <View style={styles.divider} />
      <View style={styles.line}>
        <Text style={styles.total}>Total · pay at the salon</Text>
        <Text style={styles.total}>{formatKes(booking.total_kes)}</Text>
      </View>
      <View style={[styles.line, styles.visit]}>
        <View style={styles.visitLeft}>
          <Feather name="smile" size={13} color={colors.subtle} />
          <Text style={styles.meta}>{visitLine(booking)}</Text>
        </View>
        <Text style={styles.meta}>{localPhone(phone)}</Text>
      </View>

      {started || actions.cancel ? (
        <View style={styles.actions}>
          {started ? (
            <>
              {actions.noShow ? (
                <Outline label="No-show" onPress={onNoShow} style={styles.noShow} tall />
              ) : null}
              {actions.markDone ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark done"
                  accessibilityState={{ busy }}
                  disabled={busy}
                  onPress={onMarkDone}
                  style={({ pressed }) => [styles.markDone, pressed && styles.pressed]}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.markDoneText}>Mark done</Text>
                  )}
                </Pressable>
              ) : null}
              {actions.cancel ? (
                <Outline
                  label="More: cancel booking"
                  icon={<Text style={styles.dots}>···</Text>}
                  hideLabel
                  onPress={onCancel}
                  style={styles.more}
                  tall
                />
              ) : null}
            </>
          ) : (
            <Outline label="Cancel booking" onPress={onCancel} style={styles.flex} tall />
          )}
        </View>
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type OutlineProps = {
  label: string;
  icon?: ReactNode;
  hideLabel?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
  /** 48 px, as in the action row; the contact buttons are 47. */
  tall?: boolean;
};

function Outline({ label, icon, hideLabel, disabled, onPress, style, tall }: OutlineProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outline,
        tall && styles.tall,
        style ?? styles.flex,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      {hideLabel ? null : <Text style={styles.outlineText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  open: {
    borderColor: colors.borderStrong,
    paddingBottom: 13,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  greyed: { opacity: 0.55 },
  head: { flexDirection: "row" },
  bar: { width: 4, borderRadius: 2, marginVertical: 1, marginRight: 12 },
  when: { width: 64 },
  time: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  duration: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.subtle },
  body: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameLink: { flex: 1 },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  price: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.subtle },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  details: { marginTop: 11 },
  contact: { flexDirection: "row", gap: 10 },
  outline: {
    minHeight: 47,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tall: { minHeight: 48 },
  flex: { flex: 1 },
  outlineText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  sectionLabel: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtle,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  lineText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.cardLine, marginTop: 8 },
  total: { marginTop: 4, fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.ink },
  visit: { marginTop: 6 },
  visitLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.subtle },
  actions: { flexDirection: "row", gap: 10, marginTop: 13 },
  noShow: { flex: 105 },
  markDone: {
    flex: 146,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  markDoneText: { fontFamily: fonts.medium, fontSize: 15, color: colors.white },
  more: { width: 48 },
  dots: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, marginTop: -6 },
  error: { marginTop: 10, fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
