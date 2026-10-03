import { bookingLink } from "@bookflow/shared";
import { router, type Href } from "expo-router";
import * as Updates from "expo-updates";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { formatBuildInfo } from "../../../build-info";
import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../theme";
import { Badge, Button, Card, ListRow, Screen } from "../../../ui";

const buildInfo = formatBuildInfo(Updates);

const BUSINESS_PROFILE: { title: string; detail: string; href: Href }[] = [
  { title: "My brand", detail: "Name, logo, banner and about", href: "/business/brand" },
  {
    title: "My services",
    detail: "Prices, durations, what's bookable",
    href: "/business/services",
  },
  { title: "My team", detail: "Who clients can book", href: "/business/team" },
  { title: "Opening hours", detail: "When clients can book", href: "/business/hours" },
  { title: "Location", detail: "Address and map pin", href: "/business/location" },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[type.caption, { color: colors.muted }]}>{label}</Text>
      <Text style={type.bodyStrong} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function AccountScreen() {
  const { session, membership, signOut, reloadMembership } = useSession();
  const [error, setError] = useState<string>();
  const isOwner = membership?.role === "owner";

  function confirmLogOut() {
    Alert.alert("Log out?", "You'll need a new code from your email to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  function confirmUnpublish() {
    if (!membership) return;
    Alert.alert(
      "Unpublish your salon?",
      "Clients won't be able to open your booking page or book until you publish again. Existing bookings stay.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unpublish",
          style: "destructive",
          onPress: () => {
            void getSupabase()
              .rpc("set_salon_published", { p_salon_id: membership.salon.id, p_published: false })
              .then(async ({ error: unpublishError }) => {
                if (unpublishError)
                  setError("Couldn't unpublish. Check your connection and try again.");
                else await reloadMembership();
              });
          },
        },
      ],
    );
  }

  return (
    <Screen
      edges={["top"]}
      footer={<Button title="Log out" variant="danger" onPress={confirmLogOut} />}
    >
      <Text style={type.display}>Account</Text>
      <Card style={styles.card}>
        <Row label="Signed in as" value={session?.user.email ?? ""} />
        {membership ? (
          <>
            <Row label="Salon" value={membership.salon.name} />
            <View style={styles.row}>
              <View style={styles.linkLabel}>
                <Text style={[type.caption, { color: colors.muted }]}>Booking link</Text>
                <Badge
                  label={membership.salon.isPublished ? "Live" : "Not published"}
                  variant={membership.salon.isPublished ? "confirmed" : "completed"}
                />
              </View>
              <Text style={type.bodyStrong} selectable>
                {bookingLink(membership.salon.slug)}
              </Text>
              {!membership.salon.isPublished ? (
                <Text style={[type.caption, { color: colors.muted }]}>
                  Publish your salon first so clients can book.
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </Card>

      {isOwner ? (
        <View>
          <Text style={styles.section}>Business profile</Text>
          {BUSINESS_PROFILE.map((item) => (
            <ListRow
              key={item.title}
              title={item.title}
              detail={item.detail}
              onPress={() => router.push(item.href)}
            />
          ))}
        </View>
      ) : null}

      {isOwner && membership?.salon.isPublished ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Unpublish salon"
          onPress={confirmUnpublish}
          style={styles.link}
        >
          <Text style={styles.unpublish}>Unpublish salon</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={[type.caption, { color: colors.muted }]}>Version {buildInfo}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space(4) },
  row: { gap: space(1) },
  linkLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { ...type.caption, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  link: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  unpublish: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
  error: { ...type.caption, color: colors.danger },
});
