import { bookingLink } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../lib/session";
import { isSetupComplete, publishErrorMessage, type SetupStatus } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../theme";
import { Button, Card, Illustration, Screen } from "../../../ui";

/** "Tuesday, 15 September", as in design 12. */
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

/** Design 12 without the stat tiles, which come with Phase 4 (approved deviation). */
function NoBookings({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const link = bookingLink(slug);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <View style={styles.empty}>
      <Illustration name="screens" scale={0.74} />
      <Text style={styles.emptyTitle}>No Bookings yet</Text>
      <Text style={styles.emptyBody}>
        Share your{" "}
        <Text
          style={styles.inlineLink}
          accessibilityRole="link"
          accessibilityHint="Copies your booking link"
          onPress={() => {
            void Clipboard.setStringAsync(link).then(() => setCopied(true));
          }}
        >
          booking link
        </Text>{" "}
        on WhatsApp or Instagram, and appointments will land here automatically.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share your booking link"
        onPress={() => void Share.share({ message: link })}
        style={({ pressed }) => [styles.share, pressed && styles.pressed]}
      >
        <Text style={styles.shareText}>Share your booking link</Text>
        <Feather name="chevron-right" size={22} color={colors.white} />
      </Pressable>
      {copied ? (
        <Text style={styles.copied} accessibilityLiveRegion="polite">
          Link copied
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginTop: space(6) },
  salon: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: "#000000" },
  date: { fontFamily: fonts.regular, fontSize: 17, color: "#111111" },
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
  empty: { alignItems: "center", marginTop: space(9) },
  emptyTitle: {
    fontFamily: fonts.regular,
    fontSize: 25,
    color: "#000000",
    marginTop: space(6),
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 26,
    color: "#111111",
    textAlign: "center",
    marginTop: space(6),
  },
  inlineLink: { color: colors.inputBlue },
  share: {
    marginTop: space(8),
    width: 228,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: space(3),
    paddingRight: space(3),
  },
  shareText: { fontFamily: fonts.medium, fontSize: 17, fontStyle: "italic", color: colors.white },
  pressed: { opacity: 0.85 },
  copied: { ...type.caption, color: colors.muted, marginTop: space(3) },
  error: { ...type.caption, color: colors.danger },
});
