import { bookingLink } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../lib/session";
import { isSetupComplete, publishErrorMessage, type SetupStatus } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../theme";
import { Button, Card, Illustration, Screen } from "../../../ui";

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

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.salon} accessibilityRole="header">
          {membership.salon.name}
        </Text>
        <Text style={styles.date}>{todayLabel(membership.salon.timezone)}</Text>
      </View>
      {membership.salon.isPublished ? (
        <NoBookings slug={membership.salon.slug} />
      ) : (
        <SetupCard salonId={membership.salon.id} isOwner={membership.role === "owner"} />
      )}
    </Screen>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share your booking link"
        onPress={() => void Share.share({ message: bookingLink(slug) })}
        style={({ pressed }) => [styles.share, pressed && styles.pressed]}
      >
        <Text style={styles.shareText}>Share your booking link ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 9 },
  salon: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: colors.ink },
  date: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.subtle },
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
  share: {
    marginTop: 25,
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
