import { bookingLink } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../lib/session";
import { isSetupComplete, publishErrorMessage, type SetupStatus } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, minTouch, radius, space, type } from "../../../theme";
import { Badge, Button, Card, Screen } from "../../../ui";

function todayLabel(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date());
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
        <Text style={[type.caption, { color: colors.muted }]}>
          {membership.salon.name} · {todayLabel(membership.salon.timezone)}
        </Text>
        <View style={styles.titleRow}>
          <Text style={type.display}>Today</Text>
          {membership.salon.isPublished ? <Badge label="Live" variant="confirmed" /> : null}
        </View>
      </View>
      {membership.salon.isPublished ? (
        <ShareCard slug={membership.salon.slug} />
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

function ShareCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const link = bookingLink(slug);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Card style={styles.card}>
      <View style={styles.emptyIcon}>
        <Feather name="inbox" size={28} color={colors.brand} />
      </View>
      <Text style={[type.heading, styles.center]}>No bookings yet</Text>
      <Text style={[type.body, styles.center, { color: colors.muted }]}>
        Share your booking link on WhatsApp, Instagram or TikTok so clients can book you.
      </Text>
      <Text style={[type.caption, styles.center, { color: colors.ink }]} selectable>
        {link}
      </Text>
      <View style={styles.actions}>
        <Button
          title="Share your booking link"
          variant="brand"
          onPress={() => void Share.share({ message: link })}
        />
        <Button
          title={copied ? "Copied" : "Copy link"}
          variant="secondary"
          onPress={() => {
            void Clipboard.setStringAsync(link).then(() => setCopied(true));
          }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: space(1) },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
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
  emptyIcon: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: radius,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { textAlign: "center" },
  actions: { gap: space(3), marginTop: space(2) },
  error: { ...type.caption, color: colors.danger },
});
