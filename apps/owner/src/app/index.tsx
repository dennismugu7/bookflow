import { formatKes } from "@bookflow/shared";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookflow Owner</Text>
      <Text style={styles.amount}>{formatKes(400)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "600" },
  amount: { fontSize: 18 },
});
