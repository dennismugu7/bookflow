import { formatKes } from "@bookflow/shared";
import * as Updates from "expo-updates";
import { StyleSheet, Text, View } from "react-native";

import { formatBuildInfo } from "../build-info";

const buildInfo = formatBuildInfo(Updates);

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookflow Owner</Text>
      <Text style={styles.amount}>{formatKes(400)}</Text>
      <Text style={styles.buildInfo}>{buildInfo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "600" },
  amount: { fontSize: 18 },
  buildInfo: { fontSize: 12, opacity: 0.6 },
});
