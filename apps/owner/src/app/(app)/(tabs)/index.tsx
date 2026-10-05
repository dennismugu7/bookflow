import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { nextFreeSlot } from "../../../lib/agenda";
import { clientHref, newBookingHref } from "../../../lib/routes";
import { useSession, type Membership } from "../../../lib/session";
import { isSetupComplete, publishErrorMessage, type SetupStatus } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { zonedParts } from "../../../lib/time";
import { useAgenda, useNow } from "../../../lib/use-agenda";
import { colors, fonts, minTouch, space, type } from "../../../theme";
import { Button, Card, FAB_SIZE, Fab, Illustration, Screen } from "../../../ui";
import { AgendaList, EmptyDayGaps, SharePill } from "../../../ui/today/AgendaList";
import { useBookingActions } from "../../../ui/today/useBookingActions";

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

const FAB_MARGIN = 24;

const newBooking = (start: Date, from: "gap" | "add") => newBookingHref({ start, from });

/** A published salon's day: stats, bookings and free gaps (owner-v3 01–04). */
function Day({ membership }: { membership: Membership }) {
  const { salon } = membership;
  const isOwner = membership.role === "owner";
  const now = useNow();
  const date = zonedParts(now, salon.timezone).date;
  const { agenda, error, refreshing, refresh, reload } = useAgenda(salon.id, date);
  const [openId, setOpenId] = useState<string>();
  const actions = useBookingActions(salon.timezone, reload, () => setOpenId(undefined));

  // A tapped notification (owner-v5 04) opens its booking once today's list has been reloaded,
  // if it is still on it (cancelled bookings are not).
  const { booking: tapped, at } = useLocalSearchParams<{ booking?: string; at?: string }>();
  const [loadedTap, setLoadedTap] = useState<string>();
  const [handledTap, setHandledTap] = useState<string>();
  useEffect(() => {
    if (at) void reload().then(() => setLoadedTap(at));
  }, [at, reload]);
  useEffect(() => {
    if (!loadedTap || loadedTap === handledTap || !agenda) return;
    setHandledTap(loadedTap);
    if (tapped && agenda.bookings.some((b) => b.id === tapped)) setOpenId(tapped);
  }, [loadedTap, handledTap, agenda, tapped]);

  // Only owners add bookings (owner_create_booking).
  const fill = isOwner ? (start: Date) => router.push(newBooking(start, "gap")) : undefined;

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
              <EmptyDayGaps agenda={agenda} timeZone={salon.timezone} onFill={fill} />
            </>
          ) : (
            <AgendaList
              agenda={agenda}
              timeZone={salon.timezone}
              now={now}
              viewer={{ isOwner, staffId: membership.staffId }}
              slug={salon.slug}
              actions={actions}
              openId={openId}
              onToggle={(id) => setOpenId((open) => (open === id ? undefined : id))}
              onFill={fill}
              onOpenClient={(id) => router.push(clientHref(id))}
              label="Next up"
            />
          )}
          {/* Room under the last card, so the + never covers an opened card's buttons. */}
          {isOwner ? <View style={styles.fabClearance} /> : null}
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
      {actions.sheets()}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: 9 },
  headerHigh: { marginTop: 2 },
  salon: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: colors.ink },
  date: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.subtle },
  fab: { position: "absolute", right: 20, bottom: FAB_MARGIN },
  fabClearance: { height: FAB_SIZE + FAB_MARGIN },
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
  error: { ...type.caption, color: colors.danger },
});
