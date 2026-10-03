import { StyleSheet, Text, View } from "react-native";

import { colors, space, type } from "../theme";
import { Screen } from "./Screen";

/** Placeholder for tabs that arrive in a later phase. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <Screen edges={["top"]}>
      <Text style={type.display}>{title}</Text>
      <View style={styles.body}>
        <Text style={type.heading}>Coming soon</Text>
        <Text style={[type.body, { color: colors.muted, textAlign: "center" }]}>{note}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(2) },
});
