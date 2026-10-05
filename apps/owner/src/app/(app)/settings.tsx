import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { openLegal } from "../../lib/legal";
import { colors, fonts, minTouch } from "../../theme";
import { goBack } from "../../ui";

/** Menu → Settings (owner-v7 02, original 33): the legal pages and Delete account. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: 45 + insets.bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={goBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Feather name="arrow-left" size={26} color={colors.ink} />
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        Settings
      </Text>
      <View style={styles.list}>
        <LinkRow title="Privacy policy" onPress={() => openLegal("privacy")} />
        <LinkRow title="Terms of service" onPress={() => openLegal("terms")} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        onPress={() => router.push("/delete-account")}
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
      >
        <Text style={styles.deleteText}>Delete account</Text>
      </Pressable>
    </View>
  );
}

function LinkRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Feather name="arrow-up-right" size={17} color={colors.ink} style={styles.rowIcon} />
      <Text style={styles.rowTitle}>{title}</Text>
      <Feather name="chevron-right" size={16} color={colors.ink} />
    </Pressable>
  );
}

// Sizes from owner-v7 02 at 390 pt.
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  back: {
    width: minTouch,
    height: minTouch,
    marginTop: 11,
    marginLeft: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  title: {
    marginTop: 26,
    marginLeft: 24,
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    color: colors.ink,
  },
  list: { marginTop: 30 },
  row: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 24,
    paddingRight: 25,
  },
  rowPressed: { backgroundColor: colors.softFill },
  rowIcon: { width: 17, marginRight: 11 },
  rowTitle: { flex: 1, fontFamily: fonts.regular, fontSize: 19, color: colors.ink },
  delete: {
    marginTop: "auto",
    alignSelf: "center",
    height: 46,
    paddingHorizontal: 26,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.field,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { fontFamily: fonts.medium, fontSize: 18, color: colors.danger },
});
