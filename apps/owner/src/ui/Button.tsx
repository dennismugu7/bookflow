import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { colors, controlHeight, fonts, radius, space } from "../theme";

type Variant =
  "primary" | "secondary" | "outline" | "brand" | "danger" | "blue" | "bluePrimary" | "action";

type Props = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: Variant;
  /** "pill" for the fully rounded buttons of the log-out sheet (31). */
  shape?: "rounded" | "pill";
  /** Smaller text, for the blue buttons inside setup cards (44, 51). */
  compact?: boolean;
  loading?: boolean;
};

const variants: Record<Variant, { background: string; text: string; border?: string }> = {
  primary: { background: colors.primary, text: colors.white },
  secondary: { background: colors.white, text: colors.ink, border: colors.border },
  // White with an ink outline: Open Google Maps, Change pin, Log out (owner-v2 06–08).
  outline: { background: colors.white, text: colors.ink, border: colors.ink },
  brand: { background: colors.brand, text: colors.white },
  danger: { background: colors.dangerTint, text: colors.danger },
  // The blue action of the sign-in sheet and setup cards (03–05, 44, 51).
  blue: { background: colors.blue, text: colors.white },
  // The blue button's shape in the app blue: Create salon (Dennis, 2026-10-05).
  bluePrimary: { background: colors.primary, text: colors.white },
  // The 52 px blue main action of owner-v5 (Send me a code, Turn on notifications).
  action: { background: colors.action, text: colors.white },
};

/** One blue (primary) button per screen; brand for sharing and links, never for destructive actions. */
export function Button({
  title,
  variant = "primary",
  shape = "rounded",
  compact = false,
  loading = false,
  disabled,
  ...rest
}: Props) {
  const v = variants[variant];
  const inactive = !!disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        (variant === "blue" || variant === "bluePrimary") && styles.blue,
        variant === "outline" && styles.outline,
        variant === "action" && styles.action,
        shape === "pill" && styles.pill,
        compact && styles.compact,
        { backgroundColor: v.background, borderColor: v.border ?? v.background },
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text
          style={[
            styles.text,
            (variant === "blue" || variant === "bluePrimary") && styles.blueText,
            variant === "outline" && styles.outlineText,
            variant === "action" && styles.actionText,
            compact && styles.compactText,
            { color: v.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: controlHeight,
    borderRadius: radius,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(5),
  },
  blue: { minHeight: 46, borderRadius: 9 },
  pill: { borderRadius: 999 },
  compact: { minHeight: 44, borderRadius: 10 },
  compactText: { fontFamily: fonts.regular, fontSize: 15 },
  text: { fontFamily: fonts.bold, fontSize: 16 },
  outline: { minHeight: 48, borderWidth: 1.5 },
  outlineText: { fontFamily: fonts.medium, fontSize: 17 },
  blueText: { fontFamily: fonts.regular, fontSize: 19 },
  action: { borderWidth: 0 },
  actionText: { fontFamily: fonts.semibold, fontSize: 17 },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
});
