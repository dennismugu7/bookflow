import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, minTouch, space } from "../theme";

type Action = { icon: ComponentProps<typeof Feather>["name"]; label: string; onPress: () => void };

type Props = {
  children: ReactNode;
  /** Top-left icon, e.g. back (51). */
  left?: Action;
  /** Top-right icon, e.g. the edit pencil (45, 57, 59) or save tick (51). */
  right?: Action;
  /** Sits in the card's bottom-right corner, e.g. the round + (50, 52). */
  fab?: ReactNode;
};

/** The bordered white card the setup screens sit in (designs 44–46, 50–59). */
export function CardScreen({ children, left, right, fab }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <KeyboardAvoidingView style={styles.page} behavior="height">
      <View
        style={[
          styles.card,
          // As in the designs, the card ends 12.7% of the screen above the bottom.
          {
            marginTop: Math.max(37, insets.top + space(3)),
            marginBottom: Math.max(insets.bottom + space(4), Math.round(height * 0.127)),
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {left ? <CornerButton action={left} side="left" /> : null}
        {right ? <CornerButton action={right} side="right" /> : null}
        {fab ? <View style={styles.fab}>{fab}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function CornerButton({ action, side }: { action: Action; side: "left" | "right" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      hitSlop={6}
      style={[styles.corner, side === "left" ? styles.cornerLeft : styles.cornerRight]}
    >
      <Feather name={action.icon} size={action.icon === "edit-2" ? 22 : 28} color={colors.ink} />
    </Pressable>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  card: {
    flex: 1,
    marginHorizontal: 39,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 64, paddingBottom: 96, gap: space(4) },
  corner: {
    position: "absolute",
    top: space(4),
    width: minTouch,
    height: minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  cornerLeft: { left: space(2) },
  cornerRight: { right: space(3) },
  fab: { position: "absolute", right: 27, bottom: 39 },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 23,
    lineHeight: 28,
    color: "#1A1A1A",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.text,
    textAlign: "center",
    marginTop: -space(1),
    paddingHorizontal: space(2),
  },
});
