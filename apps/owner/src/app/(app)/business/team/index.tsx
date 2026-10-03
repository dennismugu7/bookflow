import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { publicMediaUrl } from "../../../../lib/media";
import { useSession } from "../../../../lib/session";
import { getSupabase } from "../../../../lib/supabase";
import { colors, space, type } from "../../../../theme";
import { Badge, Button, Card, Header, ListRow, Screen } from "../../../../ui";

type Member = {
  id: string;
  display_name: string;
  title: string | null;
  photo_path: string | null;
  is_active: boolean;
  services: number;
};

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
        .select("id, display_name, title, photo_path, is_active, staff_services(count)")
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
              is_active: s.is_active,
              services: s.staff_services[0]?.count ?? 0,
            })),
          );
        });
    }, [salonId]),
  );

  const canAddSelf = membership?.role === "owner" && !membership.staffId;

  return (
    <Screen
      footer={
        <>
          {canAddSelf ? (
            <Button
              title="Add me as a team member"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/business/team/[id]", params: { id: "new", me: "1" } })
              }
            />
          ) : null}
          <Button
            title="Add a team member"
            onPress={() => router.push({ pathname: "/business/team/[id]", params: { id: "new" } })}
          />
        </>
      }
    >
      <Header title="My team" subtitle="Who clients can book" />
      {team?.length === 0 ? (
        <Card>
          <Text style={type.heading}>No one on the team yet</Text>
          <Text style={[type.body, { color: colors.muted }]}>
            Working alone? Tap “Add me as a team member”. Clients pick who they book with.
          </Text>
        </Card>
      ) : null}
      {team?.map((m) => (
        <View key={m.id} style={styles.member}>
          {m.photo_path ? (
            <Image
              source={{ uri: publicMediaUrl(m.photo_path) }}
              style={styles.photo}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.photo, styles.initial]}>
              <Text style={type.heading}>{m.display_name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.row}>
            <ListRow
              title={m.display_name}
              detail={[m.title, `${m.services} ${m.services === 1 ? "service" : "services"}`]
                .filter(Boolean)
                .join(" · ")}
              trailing={
                !m.is_active ? (
                  <Badge label="Inactive" variant="completed" />
                ) : m.services === 0 ? (
                  <Badge label="No services" variant="due" />
                ) : undefined
              }
              onPress={() => router.push({ pathname: "/business/team/[id]", params: { id: m.id } })}
            />
          </View>
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: "row", alignItems: "center", gap: space(3) },
  photo: { width: 44, height: 44, borderRadius: 22 },
  initial: { backgroundColor: colors.brandTint, alignItems: "center", justifyContent: "center" },
  row: { flex: 1 },
  error: { ...type.caption, color: colors.danger },
});
