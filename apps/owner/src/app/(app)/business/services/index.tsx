import { formatKes } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { minutesLabel } from "../../../../lib/display";
import { useSession } from "../../../../lib/session";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../../theme";
import { Badge, Fab, Illustration } from "../../../../ui";

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_kes: number;
  is_bookable: boolean;
};

const openService = (id: string) =>
  router.push({ pathname: "/business/services/[id]", params: { id } });

/** My services: empty (47) and list (49). */
export default function ServicesScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [services, setServices] = useState<Service[]>();
  const [error, setError] = useState<string>();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      if (!salonId) return;
      void getSupabase()
        .from("services")
        .select("id, name, duration_min, price_kes, is_bookable")
        .eq("salon_id", salonId)
        .order("sort_order", { nullsFirst: false })
        .order("created_at")
        .then(({ data, error: loadError }) => {
          if (loadError) setError("Couldn't load your services. Go back and try again.");
          else setServices(data);
        });
    }, [salonId]),
  );

  const empty = services?.length === 0;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/account"))}
          hitSlop={8}
          style={styles.back}
        >
          <Feather name="arrow-left" size={28} color={colors.ink} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          My Services
        </Text>
      </View>

      <ScrollView
        style={empty ? styles.white : styles.grey}
        contentContainerStyle={empty ? styles.emptyContent : styles.list}
      >
        {empty ? (
          <>
            <Illustration name="screens" scale={1.28} />
            <Text style={styles.emptyTitle}>No service{"\n"}added to your menu</Text>
            <Text style={styles.emptyBody}>Give your clients something new to book</Text>
          </>
        ) : null}
        {services?.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}, ${minutesLabel(s.duration_min)}, ${formatKes(s.price_kes)}${s.is_bookable ? "" : ", hidden"}. Edit`}
            onPress={() => openService(s.id)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardText}>
              <Text style={styles.name}>{s.name}</Text>
              <View style={styles.durationRow}>
                <Text style={styles.duration}>{minutesLabel(s.duration_min)}</Text>
                {s.is_bookable ? null : <Badge label="Hidden" variant="completed" />}
              </View>
              <Text style={styles.price}>{formatKes(s.price_kes)}</Text>
            </View>
            <MaterialCommunityIcons name="pencil" size={26} color={colors.ink} />
          </Pressable>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.fab, { bottom: 31 + insets.bottom }]}>
        <Fab label="Add a service" tone="teal" size={78} onPress={() => openService("new")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  header: { paddingTop: space(4), paddingBottom: space(6), paddingLeft: 30, gap: space(2) },
  back: { width: minTouch, height: minTouch, justifyContent: "center", marginLeft: 0 },
  title: { fontFamily: fonts.semibold, fontSize: 27, color: "#111111", marginLeft: 22 },
  white: { backgroundColor: colors.white },
  grey: { backgroundColor: "#F3F3F3" },
  emptyContent: { flexGrow: 1, alignItems: "center", paddingTop: space(14), paddingBottom: 140 },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 22,
    color: "#111111",
    textAlign: "center",
    marginTop: space(10),
  },
  emptyBody: {
    fontFamily: fonts.medium,
    fontStyle: "italic",
    fontSize: 13,
    color: "#111111",
    marginTop: space(2),
  },
  list: { padding: 23, paddingBottom: 140, gap: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.85 },
  cardText: { flex: 1, gap: space(2) },
  name: { fontFamily: fonts.semibold, fontSize: 17, color: "#222222" },
  durationRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  duration: { fontFamily: fonts.regular, fontSize: 15, letterSpacing: 1.5, color: "#888888" },
  price: { fontFamily: fonts.bold, fontSize: 19, color: colors.forest },
  fab: { position: "absolute", right: 23 },
  error: { ...type.caption, color: colors.danger },
});
