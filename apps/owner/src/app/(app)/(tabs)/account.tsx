import { bookingLink } from "@bookflow/shared";
import * as Updates from "expo-updates";
import { Alert, StyleSheet, Text, View } from "react-native";

import { formatBuildInfo } from "../../../build-info";
import { useSession } from "../../../lib/session";
import { colors, space, type } from "../../../theme";
import { Button, Card, Screen } from "../../../ui";

const buildInfo = formatBuildInfo(Updates);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[type.caption, { color: colors.muted }]}>{label}</Text>
      <Text style={type.bodyStrong} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function AccountScreen() {
  const { session, membership, signOut } = useSession();

  function confirmLogOut() {
    Alert.alert("Log out?", "You'll need a new code from your email to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen
      edges={["top"]}
      footer={<Button title="Log out" variant="danger" onPress={confirmLogOut} />}
    >
      <Text style={type.display}>Account</Text>
      <Card style={styles.card}>
        <Row label="Signed in as" value={session?.user.email ?? ""} />
        {membership ? (
          <>
            <Row label="Salon" value={membership.salon.name} />
            <Row label="Booking link" value={bookingLink(membership.salon.slug)} />
          </>
        ) : null}
      </Card>
      <Text style={[type.caption, { color: colors.muted }]}>Version {buildInfo}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space(4) },
  row: { gap: space(1) },
});
