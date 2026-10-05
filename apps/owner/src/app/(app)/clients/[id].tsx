import { compactKes, formatUsualGap, initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  amount,
  localPhone,
  serviceLine,
  telLink,
  whatsappLink,
  type AgendaBooking,
} from "../../../lib/agenda";
import {
  NOTES_DEBOUNCE_MS,
  NOTES_MAX,
  clientTint,
  parseProfile,
  pastVisitLine,
  upcomingTitle,
  type ClientProfile,
} from "../../../lib/clients";
import { newBookingHref } from "../../../lib/routes";
import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { ceilToMinutes } from "../../../lib/time";
import { useNow } from "../../../lib/use-agenda";
import { colors, fonts } from "../../../theme";
import { Badge, BottomSheet, Page } from "../../../ui";
import { BookingSheet } from "../../../ui/today/BookingSheet";
import { useBookingActions } from "../../../ui/today/useBookingActions";

type SaveState = "idle" | "saving" | "saved" | "error";

/** A client's profile: contact, Book, stats, the next booking, notes and past visits (owner-v4 05). */
export default function ClientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useSession();
  const timeZone = membership?.salon.timezone ?? "Africa/Nairobi";
  const isOwner = membership?.role === "owner";
  const now = useNow();
  const [profile, setProfile] = useState<ClientProfile>();
  const [bookingCount, setBookingCount] = useState<number>();
  const [error, setError] = useState<string>();
  const [menu, setMenu] = useState<"menu" | "delete">();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabase();
    const [p, count] = await Promise.all([
      supabase.rpc("get_client_profile", { p_client_id: id }),
      // Any booking at all (even cancelled) keeps the client: bookings point at them.
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("client_id", id),
    ]);
    if (p.error || !p.data) {
      setError(
        p.error?.code === "BF404"
          ? "This client is no longer in your list."
          : "Couldn't load this client. Go back and try again.",
      );
      return;
    }
    try {
      setProfile(parseProfile(p.data));
      setBookingCount(count.count ?? undefined);
      setError(undefined);
    } catch {
      setError("Couldn't read this client. Update the app and try again.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const actions = useBookingActions(timeZone, load);

  const client = profile?.client;
  const phone = client?.phone ?? null;

  async function deleteClient() {
    if (!client) return;
    setDeleting(true);
    setDeleteError(undefined);
    const { error: deleteFailed } = await getSupabase()
      .from("clients")
      .delete()
      .eq("id", client.id);
    setDeleting(false);
    if (deleteFailed) {
      setDeleteError(
        deleteFailed.code === "23503"
          ? "This client has bookings, so they stay in your list."
          : "Couldn't delete this client. Check your connection and try again.",
      );
      return;
    }
    setMenu(undefined);
    router.back();
  }

  return (
    <Page
      title={client?.full_name ?? ""}
      right={
        isOwner && client
          ? { icon: "more-horizontal", label: "More", onPress: () => setMenu("menu") }
          : undefined
      }
      gap={0}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/clients"))}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {client && profile ? (
        <>
          <View style={[styles.avatar, { backgroundColor: clientTint(client.id) }]}>
            <Text style={styles.avatarText}>{initialsFor(client.full_name)}</Text>
          </View>
          <View style={styles.phoneRow}>
            <Text style={styles.phone}>{phone ? localPhone(phone) : "No phone"}</Text>
            {phone && !client.phone_verified ? (
              <Badge label="Phone not verified" variant="unverified" size="small" />
            ) : null}
          </View>

          <View style={styles.buttons}>
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
            {isOwner ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Book ${client.full_name}`}
                onPress={() =>
                  router.push(
                    newBookingHref({
                      start: ceilToMinutes(new Date(), 15),
                      from: "add",
                      clientId: client.id,
                    }),
                  )
                }
                style={({ pressed }) => [styles.button, styles.book, pressed && styles.pressed]}
              >
                <Text style={styles.bookText}>Book</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.stats}>
            <Stat value={String(profile.stats.visits)} label="Visits" />
            <Stat value={compactKes(profile.stats.spent_kes)} label="Spent (KES)" />
            <Stat value={formatUsualGap(profile.stats.avg_gap_days)} label="Usually every" />
          </View>

          {profile.upcoming ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${upcomingTitle(profile.upcoming, timeZone)}, ${serviceLine(profile.upcoming)}. Open the booking`}
              onPress={() => setSheetOpen(true)}
              style={({ pressed }) => [styles.upcoming, pressed && styles.pressed]}
            >
              <Text style={styles.upcomingTitle}>{upcomingTitle(profile.upcoming, timeZone)}</Text>
              <Text style={styles.upcomingText}>{serviceLine(profile.upcoming)}</Text>
            </Pressable>
          ) : null}

          <Notes
            key={client.id}
            clientId={client.id}
            initial={client.notes ?? ""}
            editable={isOwner}
          />

          {profile.past.length > 0 ? (
            <>
              <Text style={[styles.section, styles.pastLabel]}>Past visits</Text>
              <View style={styles.past}>
                {profile.past.map((b) => (
                  <PastVisit key={b.id} booking={b} timeZone={timeZone} now={now} />
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      <BookingSheet
        booking={sheetOpen ? (profile?.upcoming ?? undefined) : undefined}
        timeZone={timeZone}
        now={now}
        nextId={undefined}
        viewer={{ isOwner, staffId: membership?.staffId ?? null }}
        actions={actions}
        onClose={() => setSheetOpen(false)}
      />
      {actions.sheets()}

      <BottomSheet visible={!!menu} onClose={() => setMenu(undefined)} variant="handle">
        {menu === "delete" && client ? (
          <>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              Delete {client.full_name}?
            </Text>
            <Text style={styles.sheetBody}>Their notes go too. This can&apos;t be undone.</Text>
            {deleteError ? <Text style={styles.sheetError}>{deleteError}</Text> : null}
            <View style={styles.sheetButtons}>
              <SheetButton label="Keep" onPress={() => setMenu(undefined)} />
              <SheetButton
                label={deleting ? "Deleting…" : "Delete client"}
                danger
                onPress={() => void deleteClient()}
              />
            </View>
          </>
        ) : (
          <>
            <MenuRow
              icon="edit-2"
              label="Edit name and phone"
              onPress={() => {
                setMenu(undefined);
                if (client) router.push({ pathname: "/clients/edit", params: { id: client.id } });
              }}
            />
            {bookingCount === 0 ? (
              <MenuRow
                icon="trash-2"
                label="Delete client"
                danger
                onPress={() => {
                  setDeleteError(undefined);
                  setMenu("delete");
                }}
              />
            ) : null}
          </>
        )}
      </BottomSheet>
    </Page>
  );
}

/** Notes save themselves once typing pauses, and when leaving the screen. */
function Notes({
  clientId,
  initial,
  editable,
}: {
  clientId: string;
  initial: string;
  editable: boolean;
}) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    async (value: string) => {
      pending.current = null;
      setState("saving");
      const { error } = await getSupabase()
        .from("clients")
        .update({ notes: value.trim() ? value : null })
        .eq("id", clientId);
      setState(error ? "error" : "saved");
    },
    [clientId],
  );

  // Leaving the screen saves what's still waiting.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== null) void save(pending.current);
    },
    [save],
  );

  function change(value: string) {
    setText(value);
    setState("idle");
    pending.current = value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(value), NOTES_DEBOUNCE_MS);
  }

  return (
    <View style={styles.notes}>
      <View style={styles.notesHead}>
        <Text style={styles.section}>Notes (only you see these)</Text>
        <Text
          style={[styles.saved, state === "error" && styles.savedError]}
          accessibilityLiveRegion="polite"
        >
          {state === "saving"
            ? "Saving…"
            : state === "saved"
              ? "Saved"
              : state === "error"
                ? "Couldn't save"
                : ""}
        </Text>
      </View>
      <TextInput
        accessibilityLabel="Notes (only you see these)"
        value={text}
        onChangeText={change}
        editable={editable}
        multiline
        maxLength={NOTES_MAX}
        placeholder={editable ? "Preferences, allergies, anything to remember" : undefined}
        placeholderTextColor={colors.faint}
        style={styles.notesInput}
        textAlignVertical="top"
      />
    </View>
  );
}

function PastVisit({
  booking,
  timeZone,
  now,
}: {
  booking: AgendaBooking;
  timeZone: string;
  now: Date;
}) {
  const names = booking.services.map((s) => s.name).join(", ");
  return (
    <View style={styles.pastRow}>
      <View style={styles.flex}>
        <Text style={styles.pastName} numberOfLines={1}>
          {names}
        </Text>
        <Text style={styles.pastSub}>{pastVisitLine(booking, timeZone, now)}</Text>
      </View>
      {booking.status === "no_show" ? (
        <View style={styles.pill}>
          <Badge label="No-show" variant="missed" size="small" />
        </View>
      ) : (
        <Text style={styles.pastAmount}>{amount(booking.total_kes)}</Text>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Outline({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.outline,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: "edit-2" | "trash-2";
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <Feather name={icon} size={19} color={color} />
      <Text style={[styles.menuText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function SheetButton({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetButton,
        danger && styles.sheetButtonDanger,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.sheetButtonText, danger && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  avatar: {
    alignSelf: "center",
    marginTop: -3,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 23, color: colors.white },
  phoneRow: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  phone: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  buttons: { flexDirection: "row", gap: 10, marginTop: 13 },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  outline: { borderWidth: 1, borderColor: colors.cardLine, backgroundColor: colors.white },
  outlineText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  book: { backgroundColor: colors.primary },
  bookText: { fontFamily: fonts.medium, fontSize: 16, color: colors.white },
  stats: { flexDirection: "row", gap: 10, marginTop: 17 },
  stat: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, color: colors.ink },
  statLabel: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.subtle },
  upcoming: {
    marginTop: 17,
    borderRadius: 14,
    backgroundColor: colors.attentionSoft,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  upcomingTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 21,
    color: colors.attentionInk,
  },
  upcomingText: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 21,
    color: colors.attentionInk,
  },
  notes: { marginTop: 16 },
  notesHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.subtle },
  saved: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
  savedError: { color: colors.danger },
  notesInput: {
    marginTop: 8,
    minHeight: 63,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.field,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  pastLabel: { marginTop: 17 },
  past: { marginTop: 8, marginHorizontal: -20 },
  pill: { justifyContent: "center" },
  pastRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  pastName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  pastSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.subtle },
  pastAmount: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  sheetBody: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    color: colors.subtle,
  },
  sheetError: { marginTop: 10, fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  sheetButtons: { flexDirection: "row", gap: 10, marginTop: 18 },
  sheetButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetButtonDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  sheetButtonText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  menuRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 14 },
  menuText: { fontFamily: fonts.medium, fontSize: 17 },
});
