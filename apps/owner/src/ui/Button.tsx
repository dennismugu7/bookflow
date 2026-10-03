import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { colors, controlHeight, fonts, radius, space } from "../theme";

type Variant = "primary" | "secondary" | "brand" | "danger";

type Props = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
};

const variants: Record<Variant, { background: string; text: string; border?: string }> = {
  primary: { background: colors.ink, text: colors.white },
  secondary: { background: colors.white, text: colors.ink, border: colors.border },
  brand: { background: colors.brand, text: colors.white },
  danger: { background: colors.dangerTint, text: colors.danger },
};

/** One black (primary) button per screen; brand for sharing and links, never for destructive actions. */
export function Button({ title, variant = "primary", loading = false, disabled, ...rest }: Props) {
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
        { backgroundColor: v.background, borderColor: v.border ?? v.background },
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
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
  text: { fontFamily: fonts.bold, fontSize: 16 },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
});
