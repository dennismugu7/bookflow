import { initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { avatarTint } from "../../../../lib/display";
import { publicMediaUrl } from "../../../../lib/media";
import { useSession } from "../../../../lib/session";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, minTouch, type } from "../../../../theme";
import { Badge, Fab, Illustration, Page } from "../../../../ui";

type Member = {
  id: string;
  display_name: string;
  title: string | null;
  photo_path: string | null;
  updated_at: string;
  is_active: boolean;
  services: number;
};

const editMember = (id: string, me = false) =>
  router.push({ pathname: "/business/team/[id]", params: me ? { id, me: "1" } : { id } });

/** My team: rounded rows with a pencil, and the add button (owner-v2 04). No ratings yet. */
export default function TeamScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [team, setTeam] = useState<Member[]>();
  const [error, setError] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      if (!salonId) return;
      void getSupabase()
        .from("staff")
        .select("id, display_name, title, photo_path, updated_at, is_active, staff_services(count)")
        .eq("salon_id", salonId)
        .order("is_active", { ascending: false })
        .order("sort_order")
        .order("created_at")
        .then(({ data, error: loadError }) => {
          if (loadError || !data) {
            setError("Couldn't load your team. Go back and try again.");
            return;
          }
          setTeam(
            data.map((s) => ({
              id: s.id,
              display_name: s.display_name,
              title: s.title,
              photo_path: s.photo_path,
              updated_at: s.updated_at,
              is_active: s.is_active,
              services: s.staff_services[0]?.count ?? 0,
            })),
          );
        });
    }, [salonId]),
  );

  // Most salons are one person: keep the shortcut that adds the owner as a team member.
  const canAddSelf = membership?.role === "owner" && !membership.staffId;
  const addSelf = canAddSelf ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add me as a team member"
      onPress={() => editMember("new", true)}
      style={styles.addSelf}
    >
      <Text style={styles.addSelfText}>Working alone? Add me as a team member</Text>
    </Pressable>
  ) : null;

  return (
    <Page
      title="My team"
      gap={12}
      fab={<Fab label="Add a team member" onPress={() => editMember("new")} />}
    >
      {team?.length === 0 ? (
        <View style={styles.empty}>
          <Illustration name="planets" />
          {/* Copy from the original empty state (50); the redesign has no empty mockup. */}
          <Text style={styles.emptyTitle}>No members added</Text>
          <Text style={styles.emptyBody}>
            Add your team so clients can book their favorite specialist by name, photo, and
            expertise—not just an open calendar slot.
          </Text>
        </View>
      ) : null}
      {team?.map((m) => (
        <View key={m.id} style={styles.member}>
          {m.photo_path ? (
            <Image
              source={{ uri: publicMediaUrl(m.photo_path, m.updated_at) }}
              style={styles.avatar}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarTint(m.display_name) }]}>
              <Text style={styles.initials}>{initialsFor(m.display_name)}</Text>
            </View>
          )}
          <View style={styles.memberText}>
            <Text style={styles.name}>{m.display_name}</Text>
            {m.title ? <Text style={styles.title}>{m.title}</Text> : null}
            {!m.is_active ? (
              <Badge label="Inactive" variant="completed" />
            ) : m.services === 0 ? (
              <Badge label="No services" variant="due" />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${m.display_name}'s profile`}
              onPress={() =>
                router.push({ pathname: "/business/team/profile/[id]", params: { id: m.id } })
              }
              style={styles.view}
            >
              <Text style={styles.viewText}>View profile</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${m.display_name}`}
            onPress={() => editMember(m.id)}
            style={styles.pencil}
          >
            <Feather name="edit-3" size={22} color={colors.ink} />
          </Pressable>
        </View>
      ))}
      {team ? addSelf : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingTop: 56, gap: 12 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink, marginTop: 20 },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.subtle,
    textAlign: "center",
  },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardLine,
    paddingVertical: 15,
    paddingLeft: 16,
    paddingRight: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  memberText: { flex: 1, gap: 1, alignItems: "flex-start" },
  name: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23, color: colors.ink },
  title: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.subtle },
  view: { minHeight: 28, justifyContent: "center" },
  viewText: { fontFamily: fonts.medium, fontSize: 16, color: colors.action },
  pencil: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  addSelf: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  addSelfText: { fontFamily: fonts.medium, fontSize: 16, color: colors.action },
  error: { ...type.caption, color: colors.danger },
});
