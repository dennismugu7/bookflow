import { bookingLink } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, Share, StyleSheet, Text, View } from "react-native";

import {
  actionsFor,
  nextBookingId,
  nextFreeSlot,
  timeline,
  type Agenda,
  type AgendaBooking,
} from "../../../lib/agenda";
import { statusErrorMessage } from "../../../lib/new-booking";
import { useSession, type Membership } from "../../../lib/session";
import { isSetupComplete, publishErrorMessage, type SetupStatus } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { useAgenda, useNow } from "../../../lib/use-agenda";
import { colors, fonts, minTouch, space, type } from "../../../theme";
import { Button, Card, Fab, Illustration, Screen } from "../../../ui";
import { BookingCard } from "../../../ui/today/BookingCard";
import { GapRow } from "../../../ui/today/GapRow";
import { StatTiles } from "../../../ui/today/StatTiles";
import { CancelSheet, NoShowSheet } from "../../../ui/today/StatusSheets";

/** "Saturday, 4 October", as in owner-v2 09. */
function todayLabel(timeZone: string): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(new Date());
  return `${part({ weekday: "long" })}, ${part({ day: "numeric", month: "long" })}`;
}

const CHECKLIST: { key: keyof SetupStatus; title: string; detail: string; href: Href }[] = [
  {
    key: "services",
    title: "Services",
    detail: "At least one service clients can book",
    href: "/business/services",
  },
  {
    key: "team",
    title: "Team",
    detail: "Someone who offers those services",
    href: "/business/team",
  },
  {
    key: "hours",
    title: "Opening hours",
    detail: "When clients can book",
    href: "/business/hours",
  },
];

export default function TodayScreen() {
  const { membership } = useSession();
  if (!membership) return null;
  if (membership.salon.isPublished) return <Day membership={membership} />;

  return (
    <Screen edges={["top"]}>
      <Header membership={membership} />
      <SetupCard salonId={membership.salon.id} isOwner={membership.role === "owner"} />
    </Screen>
  );
}

/** The v3 list sits 7 pt higher than the v2 empty state (owner-v3 01 vs owner-v2 09). */
function Header({ membership, high = false }: { membership: Membership; high?: boolean }) {
  return (
    <View style={[styles.header, high && styles.headerHigh]}>
      <Text style={styles.salon} accessibilityRole="header">
        {membership.salon.name}
      </Text>
      <Text style={styles.date}>{todayLabel(membership.salon.timezone)}</Text>
    </View>
  );
}

const newBooking = (start: Date, from: "gap" | "add"): Href => ({
  pathname: "/booking/new",
  params: { start: start.toISOString(), from },
});

type Sheet = { kind: "cancel" | "noShow"; booking: AgendaBooking };

/** A published salon's day: stats, bookings and free gaps (owner-v3 01–04). */
function Day({ membership }: { membership: Membership }) {
  const { salon } = membership;
  const isOwner = membership.role === "owner";
  const now = useNow();
  const { agenda, error, refreshing, refresh, reload } = useAgenda(salon.id, salon.timezone, now);
  const [openId, setOpenId] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const [cardError, setCardError] = useState<{ id: string; message: string }>();
  const [sheet, setSheet] = useState<Sheet>();
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string>();

  /** Saves a status through update_booking_status; returns a friendly error, if any. */
  async function setStatus(
    booking: AgendaBooking,
    status: "completed" | "no_show" | "cancelled",
    reason?: string | null,
  ): Promise<string | undefined> {
    const { error: saveError } = await getSupabase().rpc("update_booking_status", {
      p_booking_id: booking.id,
      p_status: status,
      p_reason: reason ?? undefined,
    });
    await reload();
    return saveError ? statusErrorMessage(saveError) : undefined;
  }

  async function markDone(booking: AgendaBooking) {
    setBusyId(booking.id);
    setCardError(undefined);
    const message = await setStatus(booking, "completed");
    setBusyId(undefined);
    if (message) setCardError({ id: booking.id, message });
  }

  async function confirmSheet(reason?: string | null) {
    if (!sheet) return;
    setSheetSaving(true);
    setSheetError(undefined);
    const message = await setStatus(
      sheet.booking,
      sheet.kind === "cancel" ? "cancelled" : "no_show",
      reason,
    );
    setSheetSaving(false);
    if (message) {
      setSheetError(message);
      return;
    }
    setSheet(undefined);
    setOpenId(undefined);
  }

  const openSheet = (kind: Sheet["kind"], booking: AgendaBooking) => {
    setSheetError(undefined);
    setSheet({ kind, booking });
  };

  // Only owners add bookings (owner_create_booking).
  const fill = isOwner ? (start: Date) => router.push(newBooking(start, "gap")) : undefined;
  const nextId = agenda ? nextBookingId(agenda.bookings, now) : undefined;

  return (
    <View style={styles.flex}>
      <Screen
        edges={["top"]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        <View>
          <Header membership={membership} high={!!agenda && agenda.bookings.length > 0} />
          {error ? <Text style={[styles.error, styles.loadError]}>{error}</Text> : null}
          {!agenda ? null : agenda.bookings.length === 0 ? (
            <>
              <NoBookings slug={salon.slug} />
              <Gaps agenda={agenda} timeZone={salon.timezone} onFill={fill} />
            </>
          ) : (
            <>
              <View style={styles.tiles}>
                <StatTiles stats={agenda.stats} />
              </View>
              <Text style={styles.nextUp}>Next up</Text>
              <View style={styles.list}>
                {timeline(agenda).map((row) =>
                  row.kind === "gap" ? (
                    <GapRow
                      key={`gap-${row.gap.starts_at}`}
                      gap={row.gap}
                      timeZone={salon.timezone}
                      onFill={fill && (() => fill(new Date(row.gap.starts_at)))}
                    />
                  ) : (
                    <BookingCard
                      key={row.booking.id}
                      booking={row.booking}
                      timeZone={salon.timezone}
                      nextId={nextId}
                      open={openId === row.booking.id}
                      onToggle={() =>
                        setOpenId((id) => (id === row.booking.id ? undefined : row.booking.id))
                      }
                      actions={actionsFor(row.booking, now, {
                        isOwner,
                        staffId: membership.staffId,
                      })}
                      busy={busyId === row.booking.id}
                      error={cardError?.id === row.booking.id ? cardError.message : undefined}
                      onMarkDone={() => void markDone(row.booking)}
                      onNoShow={() => openSheet("noShow", row.booking)}
                      onCancel={() => openSheet("cancel", row.booking)}
                    />
                  ),
                )}
              </View>
              <View style={styles.sharePill}>
                <SharePill slug={salon.slug} />
              </View>
            </>
          )}
        </View>
      </Screen>
      {isOwner ? (
        <View style={styles.fab}>
          <Fab
            label="New booking"
            onPress={() => router.push(newBooking(nextFreeSlot(agenda?.gaps ?? [], now), "add"))}
          />
        </View>
      ) : null}
      <CancelSheet
        booking={sheet?.kind === "cancel" ? sheet.booking : undefined}
        timeZone={salon.timezone}
        onClose={() => setSheet(undefined)}
        saving={sheetSaving}
        error={sheetError}
        onConfirm={(reason) => void confirmSheet(reason)}
      />
      <NoShowSheet
        booking={sheet?.kind === "noShow" ? sheet.booking : undefined}
        timeZone={salon.timezone}
        onClose={() => setSheet(undefined)}
        saving={sheetSaving}
        error={sheetError}
        onConfirm={() => void confirmSheet()}
      />
    </View>
  );
}

/** Free gaps under the empty state, when the day has no bookings yet. */
function Gaps({
  agenda,
  timeZone,
  onFill,
}: {
  agenda: Agenda;
  timeZone: string;
  onFill?: (start: Date) => void;
}) {
  if (agenda.gaps.length === 0) return null;
  return (
    <View style={[styles.list, styles.emptyGaps]}>
      {agenda.gaps.map((gap) => (
        <GapRow
          key={gap.starts_at}
          gap={gap}
          timeZone={timeZone}
          onFill={onFill && (() => onFill(new Date(gap.starts_at)))}
        />
      ))}
    </View>
  );
}

function SetupCard({ salonId, isOwner }: { salonId: string; isOwner: boolean }) {
  const { reloadMembership } = useSession();
  const [status, setStatus] = useState<SetupStatus>();
  const [error, setError] = useState<string>();
  const [publishing, setPublishing] = useState(false);

  // Refresh on focus, so ticks update after returning from a setup screen.
  useFocusEffect(
    useCallback(() => {
      void getSupabase()
        .rpc("salon_setup_status", { p_salon_id: salonId })
        .then(({ data, error: loadError }) => {
          if (loadError || !data)
            setError("Couldn't check your setup. Open another tab and come back to try again.");
          else setStatus(data as SetupStatus);
        });
    }, [salonId]),
  );

  async function publish() {
    setPublishing(true);
    setError(undefined);
    const { error: publishError } = await getSupabase().rpc("set_salon_published", {
      p_salon_id: salonId,
      p_published: true,
    });
    if (publishError) {
      setPublishing(false);
      setError(publishErrorMessage(publishError));
      return;
    }
    await reloadMembership();
    setPublishing(false);
  }

  return (
    <Card style={styles.card}>
      <Text style={type.heading}>Get ready to take bookings</Text>
      <Text style={[type.body, { color: colors.muted }]}>
        Finish these three steps, then publish your salon.
      </Text>
      {CHECKLIST.map((item) => {
        const done = status?.[item.key] ?? false;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${done ? "done" : "to do"}`}
            onPress={() => router.push(item.href)}
            style={styles.step}
          >
            <View style={[styles.tick, done && styles.tickDone]}>
              {done ? <Feather name="check" size={16} color={colors.white} /> : null}
            </View>
            <View style={styles.stepText}>
              <Text style={type.bodyStrong}>{item.title}</Text>
              <Text style={[type.caption, { color: colors.muted }]}>{item.detail}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        );
      })}
      {isOwner ? (
        <Button
          title="Publish salon"
          onPress={() => void publish()}
          loading={publishing}
          disabled={!isSetupComplete(status)}
        />
      ) : null}
      <Text style={[type.caption, { color: colors.muted }]}>
        Publish your salon first so clients can book.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

/** Today with no bookings: option A of owner-v2 09 (calendar tick). */
function NoBookings({ slug }: { slug: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <Illustration name="calendar-tick" />
      </View>
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptyBody}>
        Share your link on WhatsApp or Instagram. New bookings show up here.
      </Text>
      <View style={styles.emptyShare}>
        <SharePill slug={slug} />
      </View>
    </View>
  );
}

function SharePill({ slug }: { slug: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share your booking link"
      onPress={() => void Share.share({ message: bookingLink(slug) })}
      style={({ pressed }) => [styles.share, pressed && styles.pressed]}
    >
      <Text style={styles.shareText}>Share your booking link ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: 9 },
  headerHigh: { marginTop: 2 },
  salon: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: colors.ink },
  date: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.subtle },
  tiles: { marginTop: 17 },
  nextUp: {
    marginTop: 21,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtle,
  },
  list: { marginTop: 11, gap: 9 },
  emptyGaps: { marginTop: 32 },
  sharePill: { alignItems: "center", marginTop: 24, marginBottom: 96 },
  fab: { position: "absolute", right: 20, bottom: 24 },
  loadError: { marginTop: 12 },
  card: { alignItems: "stretch", padding: space(5), gap: space(3) },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    minHeight: minTouch + space(2),
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  tickDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepText: { flex: 1, gap: 2 },
  empty: { alignItems: "center", marginTop: 45 },
  emptyArt: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.actionTint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
    marginTop: space(7),
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
    textAlign: "center",
    marginTop: space(2),
    paddingHorizontal: space(4),
  },
  emptyShare: { marginTop: 25 },
  share: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: space(6),
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  pressed: { opacity: 0.85 },
  error: { ...type.caption, color: colors.danger },
});
