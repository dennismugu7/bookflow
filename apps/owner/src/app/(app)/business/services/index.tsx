import { formatKes } from "@bookflow/shared";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { useSession } from "../../../../lib/session";
import { formatDuration } from "../../../../lib/setup";
import { getSupabase } from "../../../../lib/supabase";
import { colors, type } from "../../../../theme";
import { Badge, Button, Card, Header, ListRow, Screen } from "../../../../ui";

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_kes: number;
  is_bookable: boolean;
};

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
    <Screen
      footer={
        <Button
          title="Add a service"
          onPress={() =>
            router.push({ pathname: "/business/services/[id]", params: { id: "new" } })
          }
        />
      }
    >
      <Header title="My services" subtitle="What clients can book, with prices and durations" />
      {services?.length === 0 ? (
        <Card>
          <Text style={type.heading}>No services yet</Text>
          <Text style={[type.body, { color: colors.muted }]}>
            Add what you offer, like braids or a silk press, with how long it takes and the price.
          </Text>
        </Card>
      ) : null}
      {services?.map((s) => (
        <ListRow
          key={s.id}
          title={s.name}
          detail={`${formatDuration(s.duration_min)} · ${formatKes(s.price_kes)}`}
          trailing={s.is_bookable ? undefined : <Badge label="Hidden" variant="completed" />}
          onPress={() => router.push({ pathname: "/business/services/[id]", params: { id: s.id } })}
        />
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...type.caption, color: colors.danger },
});
