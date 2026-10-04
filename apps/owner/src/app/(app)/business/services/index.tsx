import { formatKes } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { minutesLabel } from "../../../../lib/display";
import { useSession } from "../../../../lib/session";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, type } from "../../../../theme";
import { Badge, Fab, Illustration, Page } from "../../../../ui";

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_kes: number;
  is_bookable: boolean;
};

const openService = (id: string) =>
  router.push({ pathname: "/business/services/[id]", params: { id } });

/** My services: a card per service with a pencil, and the add button (owner-v2 02). */
export default function ServicesScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [services, setServices] = useState<Service[]>();
  const [error, setError] = useState<string>();

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

  return (
    <Page
      title="My services"
      gap={12}
      fab={<Fab label="Add a service" onPress={() => openService("new")} />}
    >
      {services?.length === 0 ? (
        <View style={styles.empty}>
          <Illustration name="screens" />
          {/* Copy from the original empty state (47); the redesign has no empty mockup. */}
          <Text style={styles.emptyTitle}>No service{"\n"}added to your menu</Text>
          <Text style={styles.emptyBody}>Give your clients something new to book</Text>
        </View>
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
          <Feather name="edit-3" size={22} color={colors.ink} />
        </Pressable>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingTop: 72, gap: 8 },
  emptyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    textAlign: "center",
    marginTop: 24,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.subtle,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardLine,
    paddingLeft: 16,
    paddingRight: 18,
    paddingVertical: 16,
  },
  pressed: { opacity: 0.85 },
  cardText: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23, color: colors.ink },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  duration: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.subtle },
  price: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  error: { ...type.caption, color: colors.danger },
});
