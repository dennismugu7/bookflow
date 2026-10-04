import { bookingLink } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, type Href } from "expo-router";
import * as Updates from "expo-updates";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatBuildInfo } from "../../../build-info";
import { initials } from "../../../lib/display";
import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../theme";
import { Badge, BottomSheet, Button } from "../../../ui";

const buildInfo = formatBuildInfo(Updates);

const ICON = { size: 24, color: colors.ink };

// Portfolio is hidden until it exists (approved deviation), as are Profile, Settings,
// Share feedback and Support in "General".
const BUSINESS_PROFILE: { title: string; icon: ReactNode; href: Href }[] = [
  {
    title: "My brand",
    icon: <MaterialCommunityIcons name="medal-outline" {...ICON} />,
    href: "/business/brand",
  },
  {
    title: "My services",
    icon: <MaterialCommunityIcons name="content-cut" {...ICON} />,
    href: "/business/services",
  },
  {
    title: "My team",
    icon: <MaterialCommunityIcons name="account-group-outline" {...ICON} />,
    href: "/business/team",
  },
  { title: "Opening hours", icon: <Feather name="clock" {...ICON} />, href: "/business/hours" },
  {
    title: "Location",
    icon: <Ionicons name="location-outline" {...ICON} />,
    href: "/business/location",
  },
];

export default function AccountScreen() {
  const { session, membership, signOut, reloadMembership } = useSession();
  const [error, setError] = useState<string>();
  const [confirmingLogOut, setConfirmingLogOut] = useState(false);
  const isOwner = membership?.role === "owner";
  const email = session?.user.email ?? "";

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
            <Text style={styles.initials}>{initials(email)}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {email}
          </Text>
        </View>

        {membership ? (
          <>
            <Text style={styles.band}>General</Text>
            <View style={styles.rows}>
              <Row
                icon={<Feather name="share-2" {...ICON} />}
                title="Booking link"
                trailing={
                  <Badge
                    label={membership.salon.isPublished ? "Live" : "Not published"}
                    variant={membership.salon.isPublished ? "confirmed" : "completed"}
                  />
                }
                accessibilityLabel={`Share your booking link, ${bookingLink(membership.salon.slug)}`}
                onPress={() => void Share.share({ message: bookingLink(membership.salon.slug) })}
              />
              {isOwner && membership.salon.isPublished ? (
                <Row
                  icon={<Feather name="eye-off" size={ICON.size} color={colors.danger} />}
                  title="Unpublish salon"
                  danger
                  onPress={confirmUnpublish}
                />
              ) : null}
            </View>
          </>
        ) : null}

        {isOwner ? (
          <>
            <Text style={styles.band}>Business Profile</Text>
            <View style={styles.rows}>
              {BUSINESS_PROFILE.map((item) => (
                <Row
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  onPress={() => router.push(item.href)}
                />
              ))}
            </View>
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
  trailing,
  danger = false,
  accessibilityLabel,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  trailing?: ReactNode;
  danger?: boolean;
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
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.band },
  scroll: { flexGrow: 1 },
  profile: {
    backgroundColor: colors.white,
    alignItems: "center",
    paddingTop: space(8),
    paddingBottom: space(8),
    paddingHorizontal: space(6),
    gap: space(4),
  },
  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: colors.avatarGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.bold, fontSize: 46, color: colors.avatarGreen },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.forest },
  band: {
    backgroundColor: colors.band,
    paddingLeft: 42,
    paddingVertical: space(3),
    fontFamily: fonts.medium,
    fontSize: 17,
    color: "#111111",
  },
  rows: { backgroundColor: colors.white, paddingVertical: space(2) },
  row: {
    minHeight: minTouch,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 40,
    paddingRight: space(6),
    gap: space(5),
  },
  rowPressed: { backgroundColor: colors.band },
  rowIcon: { width: 28, alignItems: "center" },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16.5,
    letterSpacing: 1.8,
    color: "#222222",
  },
  bottom: {
    flexGrow: 1,
    justifyContent: "flex-end",
    padding: 26,
    paddingTop: space(10),
    gap: space(3),
  },
  logOut: {
    minHeight: 49,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#777777",
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 26,
    gap: space(2),
  },
  logOutText: { fontFamily: fonts.bold, fontSize: 19, color: colors.ink },
  pressed: { opacity: 0.85 },
  version: { color: colors.muted, textAlign: "center" },
  error: { ...type.caption, color: colors.danger },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  sheetBody: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, color: colors.ink },
  sheetEmail: { fontFamily: fonts.bold },
  sheetActions: { flexDirection: "row", gap: space(3), marginTop: space(6) },
  flex: { flex: 1 },
});
