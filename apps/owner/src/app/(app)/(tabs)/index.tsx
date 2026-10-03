import { bookingLink } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../lib/session";
import { colors, radius, space, type } from "../../../theme";
import { Button, Card, Screen } from "../../../ui";

function todayLabel(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date());
}

export default function TodayScreen() {
  const { membership } = useSession();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!membership) return null;
  const link = bookingLink(membership.salon.slug);

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <Text style={[type.caption, { color: colors.muted }]}>
          {membership.salon.name} · {todayLabel(membership.salon.timezone)}
        </Text>
        <Text style={type.display}>Today</Text>
      </View>

      <Card style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Feather name="inbox" size={28} color={colors.brand} />
        </View>
        <Text style={[type.heading, styles.center]}>No bookings yet</Text>
        <Text style={[type.body, styles.center, { color: colors.muted }]}>
          Share your booking link on WhatsApp, Instagram or TikTok so clients can book you.
        </Text>
        <Text style={[type.caption, styles.center, { color: colors.ink }]} selectable>
          {link}
        </Text>
        <View style={styles.actions}>
          <Button
            title="Share your booking link"
            variant="brand"
            onPress={() => void Share.share({ message: link })}
          />
          <Button
            title={copied ? "Copied" : "Copy link"}
            variant="secondary"
            onPress={() => {
              void Clipboard.setStringAsync(link).then(() => setCopied(true));
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space(1) },
  empty: { alignItems: "stretch", padding: space(6), gap: space(3) },
  emptyIcon: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: radius,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { textAlign: "center" },
  actions: { gap: space(3), marginTop: space(2) },
});
