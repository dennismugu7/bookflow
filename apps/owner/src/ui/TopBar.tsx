import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, minTouch } from "../theme";

export type BarAction = {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  /** Defaults to going back, or to the Menu tab when there is nothing to go back to. */
  onBack?: () => void;
  right?: BarAction;
};

export const goBack = () => (router.canGoBack() ? router.back() : router.replace("/menu"));

/** The fixed white bar every owner screen starts with: back arrow and title (owner-v2 01–07). */
export function TopBar({ title, onBack = goBack, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {right ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={right.label}
            onPress={right.onPress}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Feather name={right.icon} size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The title style shared by every owner screen. */
export const titleStyle = { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink } as const;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  row: { height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  button: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  title: { ...titleStyle, flex: 1, marginLeft: 15 },
});
