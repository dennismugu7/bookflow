import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { initials } from "../../../../../lib/display";
import { publicMediaUrl } from "../../../../../lib/media";
import { getSupabase } from "../../../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../../../theme";
import { Badge } from "../../../../../ui";

type Profile = {
  name: string;
  title: string | null;
  about: string | null;
  photoUri: string | null;
  isActive: boolean;
  services: string[];
};

const SHOWN_SERVICES = 2;

/** A team member as clients see them (53), without the rating until reviews exist. */
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
    <SafeAreaView style={styles.backdrop}>
      <View style={styles.page}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.icon}
          >
            <Feather name="x" size={30} color={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit team member"
            onPress={edit}
            style={styles.icon}
          >
            <Feather name="edit-2" size={28} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
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
                  <View style={[styles.photo, styles.initials]}>
                    <Text style={styles.initialsText}>{initials(profile.name)}</Text>
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
                  <Feather name="chevron-right" size={22} color="#777777" />
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#C4C4C4" },
  page: {
    flex: 1,
    marginTop: 5,
    backgroundColor: colors.band,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space(5),
    paddingTop: space(4),
  },
  icon: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  scroll: { flexGrow: 1, paddingBottom: space(10) },
  hero: { alignItems: "center", gap: space(2), marginTop: space(10) },
  photo: { width: 206, height: 206, borderRadius: 103, marginBottom: space(6) },
  initials: { backgroundColor: colors.brandTint, alignItems: "center", justifyContent: "center" },
  initialsText: { fontFamily: fonts.bold, fontSize: 64, color: colors.brand },
  name: { fontFamily: fonts.bold, fontSize: 23, color: "#000000", textAlign: "center" },
  title: { fontFamily: fonts.regular, fontSize: 16, color: "#111111" },
  services: {
    backgroundColor: colors.white,
    marginHorizontal: 22,
    marginTop: space(8),
    borderRadius: 10,
    padding: space(3),
    gap: space(3),
  },
  servicesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  servicesTitle: { fontFamily: fonts.semibold, fontSize: 14, color: "#333333" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.chipBlueText,
    backgroundColor: colors.chipBlueTint,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: space(3),
    paddingVertical: space(1),
  },
  more: { color: "#555555", backgroundColor: "#F2F2F2" },
  about: {
    backgroundColor: colors.white,
    paddingHorizontal: 26,
    paddingVertical: space(4),
    gap: space(2),
  },
  aboutTitle: { fontFamily: fonts.bold, fontSize: 16, color: "#000000" },
  aboutText: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: "#111111" },
  error: { ...type.caption, color: colors.danger, padding: space(5) },
});
