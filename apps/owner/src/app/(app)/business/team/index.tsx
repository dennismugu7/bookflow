import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { initials } from "../../../../lib/display";
import { publicMediaUrl } from "../../../../lib/media";
import { useSession } from "../../../../lib/session";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../../theme";
import { Badge, CardScreen, CardTitle, Fab, Illustration } from "../../../../ui";

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

/** My team: empty (50) and list (52). Ratings are left out until reviews exist. */
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
    <CardScreen fab={<Fab label="Add a team member" onPress={() => editMember("new")} />}>
      <CardTitle>My Team</CardTitle>
      {team?.length === 0 ? (
        <View style={styles.empty}>
          <Illustration name="planets" />
          <Text style={styles.emptyTitle}>No members added</Text>
          <Text style={styles.emptyBody}>
            Add your team so clients can book their favorite specialist by name, photo, and
            expertise—not just an open calendar slot.
          </Text>
          {addSelf}
        </View>
      ) : null}
      {team && team.length > 0 ? (
        <View style={styles.list}>
          {team.map((m) => (
            <View key={m.id} style={styles.member}>
              {m.photo_path ? (
                <Image
                  source={{ uri: publicMediaUrl(m.photo_path, m.updated_at) }}
                  style={styles.photo}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={[styles.photo, styles.initials]}>
                  <Text style={styles.initialsText}>{initials(m.display_name)}</Text>
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
                <Feather name="edit-2" size={17} color={colors.ink} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {team && team.length > 0 ? addSelf : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </CardScreen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", marginTop: space(12) },
  emptyTitle: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: "#000000",
    marginTop: space(8),
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.text,
    textAlign: "center",
    marginTop: space(3),
  },
  addSelf: { minHeight: minTouch, justifyContent: "center", alignSelf: "center" },
  addSelfText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inputBlue },
  list: {
    backgroundColor: "#F7F7F7",
    marginHorizontal: -space(4) + 20,
    marginTop: space(4),
    padding: 2,
    gap: space(3),
  },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingVertical: space(3),
    paddingLeft: space(3),
  },
  photo: { width: 67, height: 67, borderRadius: 34 },
  initials: { backgroundColor: colors.brandTint, alignItems: "center", justifyContent: "center" },
  initialsText: { fontFamily: fonts.bold, fontSize: 22, color: colors.brand },
  memberText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.medium, fontSize: 14.5, color: "#222222" },
  title: { fontFamily: fonts.regular, fontSize: 13, color: "#8A8A8A" },
  view: { minHeight: 32, justifyContent: "center", alignSelf: "flex-start" },
  viewText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink },
  pencil: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  error: { ...type.caption, color: colors.danger },
});
