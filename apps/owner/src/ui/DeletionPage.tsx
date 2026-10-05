import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, minTouch } from "../theme";

type Props = {
  onBack?: () => void;
  onClose?: () => void;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * The white pages of deleting an account (owner-v7 03–05): ← and × at the top, no title bar,
 * content that scrolls, and the main button in a bar with a hairline above it.
 */
export function DeletionPage({ onBack, onClose, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        {onBack ? <IconButton icon="arrow-left" label="Back" onPress={onBack} /> : <View />}
        {onClose ? <IconButton icon="x" label="Close" onPress={onClose} bold /> : null}
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>{footer}</View>
      </KeyboardAvoidingView>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  bold,
}: {
  icon: "arrow-left" | "x";
  label: string;
  onPress: () => void;
  bold?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
    >
      <Feather name={icon} size={bold ? 30 : 26} color={colors.ink} />
    </Pressable>
  );
}

/** The 52 px pill of 03–05: blue, or red for Delete account. */
export function FooterButton({
  title,
  onPress,
  disabled,
  loading,
  danger,
  arrow,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  arrow?: boolean;
}) {
  const inactive = !!disabled || !!loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: danger ? colors.danger : colors.action },
        pressed && styles.pressedButton,
        !!disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.buttonRow}>
          <Text style={styles.buttonText}>{title}</Text>
          {arrow ? <Feather name="arrow-right" size={17} color={colors.white} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  top: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 11,
  },
  icon: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 },
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingHorizontal: 24,
    paddingTop: 15,
  },
  button: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.white },
  pressedButton: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
