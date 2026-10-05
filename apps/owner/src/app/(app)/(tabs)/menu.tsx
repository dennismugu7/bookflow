import { bookingLink, initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, type Href } from "expo-router";
import * as Updates from "expo-updates";
import { useState, type ComponentProps } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatBuildInfo } from "../../../build-info";
import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, type } from "../../../theme";
import { BottomSheet, Button } from "../../../ui";
import { ShareLinkSheet } from "../../../ui/ShareLinkSheet";

const buildInfo = formatBuildInfo(Updates);

type Icon = ComponentProps<typeof Feather>["name"];

// Portfolio, Profile, Share feedback and Support stay hidden until they exist.
const BUSINESS_PROFILE: { title: string; icon: Icon; href: Href }[] = [
  { title: "My brand", icon: "award", href: "/business/brand" },
  { title: "My services", icon: "scissors", href: "/business/services" },
  { title: "My team", icon: "user", href: "/business/team" },
  { title: "Opening hours", icon: "clock", href: "/business/hours" },
  { title: "Location", icon: "map-pin", href: "/business/location" },
];

/** Menu (was Account): who you are, your salon's status and its settings (owner-v2 08). */
export default function MenuScreen() {
  const { session, membership, signOut, reloadMembership } = useSession();
  const [error, setError] = useState<string>();
  const [confirmingLogOut, setConfirmingLogOut] = useState(false);
  const [sharing, setSharing] = useState(false);
  const isOwner = membership?.role === "owner";
  const email = session?.user.email ?? "";
  const live = !!membership?.salon.isPublished;

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
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initialsFor(email)}</Text>
          </View>
          <Text style={styles.email} numberOfLines={1} adjustsFontSizeToFit>
            {email}
          </Text>
          {membership ? (
            <Text style={styles.salon} numberOfLines={1}>
              {membership.salon.name} ·{" "}
              <Text style={live ? styles.live : styles.notLive}>{live ? "Live" : "Not live"}</Text>
            </Text>
          ) : null}
        </View>

        {membership ? (
          <>
            <Text style={styles.band}>General</Text>
            <Row
              icon="share-2"
              title="Booking link"
              accessibilityLabel={`Share your booking link, ${bookingLink(membership.salon.slug)}`}
              onPress={() => setSharing(true)}
            />
            {isOwner && live ? (
              <Row icon="eye-off" title="Unpublish salon" onPress={confirmUnpublish} />
            ) : null}
            <Row icon="bell" title="Notifications" onPress={() => router.push("/notifications")} />
            <Row icon="settings" title="Settings" onPress={() => router.push("/settings")} />
          </>
        ) : null}

        {isOwner ? (
          <>
            <Text style={styles.band}>Business Profile</Text>
            {BUSINESS_PROFILE.map((item) => (
              <Row
                key={item.title}
                icon={item.icon}
                title={item.title}
                onPress={() => router.push(item.href)}
              />
            ))}
          </>
        ) : null}

        <View style={styles.bottom}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => setConfirmingLogOut(true)}
            style={({ pressed }) => [styles.logOut, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="logout" size={24} color={colors.ink} />
            <Text style={styles.logOutText}>Log out</Text>
          </Pressable>
          <Text style={[type.caption, styles.version]}>Version {buildInfo}</Text>
        </View>
      </ScrollView>

      {membership ? (
        <ShareLinkSheet
          visible={sharing}
          onClose={() => setSharing(false)}
          salon={membership.salon}
          canSave={isOwner}
        />
      ) : null}

      <BottomSheet visible={confirmingLogOut} onClose={() => setConfirmingLogOut(false)}>
        <Text style={styles.sheetTitle} accessibilityRole="header">
          Log out?
        </Text>
        <Text style={styles.sheetBody}>
          Are you sure you want to log out of{"\n"}
          <Text style={styles.sheetEmail}>{email}</Text>
        </Text>
        <View style={styles.sheetActions}>
          <View style={styles.flex}>
            <Button
              title="Go back"
              variant="secondary"
              shape="pill"
              onPress={() => setConfirmingLogOut(false)}
            />
          </View>
          <View style={styles.flex}>
            <Button title="Confirm" shape="pill" onPress={() => void signOut()} />
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function Row({
  icon,
  title,
  accessibilityLabel,
  onPress,
}: {
  icon: Icon;
  title: string;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Feather name={icon} size={22} color={colors.subtle} style={styles.rowIcon} />
      <Text style={styles.rowTitle}>{title}</Text>
      <Feather name="chevron-right" size={20} color={colors.faint} />
    </Pressable>
  );
}

const AVATAR = 96;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1 },
  profile: { alignItems: "center", paddingTop: 24, paddingBottom: 22, paddingHorizontal: 20 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 3,
    borderColor: colors.menuGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.bold, fontSize: 44, color: colors.menuGreen },
  email: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink, marginTop: 12 },
  salon: { fontFamily: fonts.regular, fontSize: 15, color: colors.subtle, marginTop: 4 },
  live: { fontFamily: fonts.semibold, color: colors.success },
  notLive: { fontFamily: fonts.semibold, color: colors.subtle },
  band: {
    backgroundColor: colors.softFill,
    paddingHorizontal: 20,
    paddingVertical: 9,
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 21,
    color: colors.ink,
  },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 21,
    paddingRight: 20,
  },
  rowPressed: { backgroundColor: colors.softFill },
  rowIcon: { width: 22, marginRight: 17 },
  rowTitle: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  bottom: { flexGrow: 1, justifyContent: "flex-end", padding: 20, paddingTop: 32, gap: 12 },
  // Log out as before (30).
  logOut: {
    minHeight: 49,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#777777",
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 26,
    gap: 8,
  },
  logOutText: { fontFamily: fonts.bold, fontSize: 19, color: colors.ink },
  pressed: { opacity: 0.85 },
  version: { color: colors.subtle, textAlign: "center" },
  error: { ...type.caption, color: colors.danger },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  sheetBody: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, color: colors.ink },
  sheetEmail: { fontFamily: fonts.bold },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  flex: { flex: 1 },
});
