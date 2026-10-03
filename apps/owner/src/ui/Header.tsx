import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTouch, space, type } from "../theme";

/** Title row with a back arrow, as in the original setup screens. */
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/account"))}
        hitSlop={8}
        style={styles.back}
      >
        <Feather name="arrow-left" size={24} color={colors.ink} />
      </Pressable>
      <View style={styles.text}>
        <Text style={type.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={[type.caption, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space(2) },
  back: {
    width: minTouch,
    height: minTouch,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -space(3),
  },
  text: { flex: 1, gap: space(1) },
});
