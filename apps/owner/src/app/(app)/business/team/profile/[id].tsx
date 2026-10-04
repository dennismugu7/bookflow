import { initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { avatarTint } from "../../../../../lib/display";
import { publicMediaUrl } from "../../../../../lib/media";
import { getSupabase } from "../../../../../lib/supabase";
import { colors, fonts, type } from "../../../../../theme";
import { Badge, Page } from "../../../../../ui";

type Profile = {
  name: string;
  title: string | null;
  about: string | null;
  photoUri: string | null;
  isActive: boolean;
  services: string[];
};

const SHOWN_SERVICES = 2;

/** A team member as clients see them (53), under the owner-v2 TopBar; no rating until reviews exist. */
export default function TeamProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState<string>();

  // Reload on focus so edits show when coming back from the edit screen.
  useFocusEffect(
    useCallback(() => {
      void getSupabase()
        .from("staff")
        .select(
          "display_name, title, bio, photo_path, is_active, updated_at, staff_services(service:services(name))",
        )
        .eq("id", id)
        .single()
        .then(({ data, error: loadError }) => {
          if (loadError || !data) {
            setError("Couldn't load this team member. Go back and try again.");
            return;
          }
          setProfile({
            name: data.display_name,
            title: data.title ?? null,
            about: data.bio ?? null,
            photoUri: publicMediaUrl(data.photo_path, data.updated_at) ?? null,
            isActive: data.is_active,
            services: data.staff_services.flatMap((s) => (s.service ? [s.service.name] : [])),
          });
        });
    }, [id]),
  );

  const edit = () => router.push({ pathname: "/business/team/[id]", params: { id } });

  return (
    <Page
      title="Team member"
      right={{ icon: "edit-3", label: "Edit team member", onPress: edit }}
      gap={24}
    >
      {profile ? (
        <>
          <View style={styles.hero}>
            {profile.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.photo}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={[styles.photo, { backgroundColor: avatarTint(profile.name) }]}>
                <Text style={styles.initialsText}>{initialsFor(profile.name)}</Text>
              </View>
            )}
            <Text style={styles.name} accessibilityRole="header">
              {profile.name}
            </Text>
            {profile.title ? <Text style={styles.title}>{profile.title}</Text> : null}
            {!profile.isActive ? <Badge label="Inactive" variant="completed" /> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Services offered, ${profile.services.length} selected. Edit`}
            onPress={edit}
            style={styles.services}
          >
            <View style={styles.servicesHead}>
              <Text style={styles.servicesTitle}>
                Services offered · {profile.services.length} selected
              </Text>
              <Feather name="chevron-right" size={22} color={colors.faint} />
            </View>
            {profile.services.length > 0 ? (
              <View style={styles.chips}>
                {profile.services.slice(0, SHOWN_SERVICES).map((name) => (
                  <Text key={name} style={styles.chip}>
                    {name}
                  </Text>
                ))}
                {profile.services.length > SHOWN_SERVICES ? (
                  <Text style={[styles.chip, styles.more]}>
                    +{profile.services.length - SHOWN_SERVICES}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>

          {profile.about ? (
            <View style={styles.about}>
              <Text style={styles.aboutTitle}>About</Text>
              <Text style={styles.aboutText}>{profile.about}</Text>
            </View>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 6, marginTop: 8 },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: { fontFamily: fonts.bold, fontSize: 52, color: colors.white },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, textAlign: "center" },
  title: { fontFamily: fonts.regular, fontSize: 16, color: colors.subtle },
  services: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  servicesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  servicesTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.action,
    backgroundColor: colors.actionTint,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  more: { color: colors.subtle, backgroundColor: colors.softFill },
  about: { gap: 8 },
  aboutTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  aboutText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  error: { ...type.caption, color: colors.danger },
});
