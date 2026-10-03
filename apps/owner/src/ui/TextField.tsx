import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, controlHeight, fonts, radius, space, type } from "../theme";

type Variant = "default" | "sheet" | "card";

type Props = TextInputProps & {
  label: string;
  /** Hides the visible label (the input keeps it for screen readers). */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  /** "sheet": light-blue sign-in field (03–05); "card": blue-outlined card field (46, 51, 58). */
  variant?: Variant;
};

export function TextField({
  label,
  hideLabel = false,
  error,
  hint,
  variant = "default",
  onFocus,
  onBlur,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const v = variants[variant];
  return (
    <View style={styles.wrapper}>
      {hideLabel ? null : <Text style={v.label}>{label}</Text>}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={placeholders[variant]}
        style={[v.input, focused && v.focused, !!error && styles.invalid, style]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space(2) },
  invalid: { borderColor: colors.danger },
  error: { ...type.caption, color: colors.danger },
  hint: { ...type.caption, color: colors.muted },
});

const placeholders: Record<Variant, string> = {
  default: colors.muted,
  sheet: "#A9A9A9",
  card: colors.placeholder,
};

const variants = {
  default: StyleSheet.create({
    label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
    input: {
      height: controlHeight,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      paddingHorizontal: space(4),
      color: colors.ink,
      fontFamily: type.body.fontFamily,
      fontSize: type.body.fontSize,
    },
    // One pixel less padding keeps the text still when the border thickens.
    focused: { borderColor: colors.select, borderWidth: 2, paddingHorizontal: space(4) - 1 },
  }),
  sheet: StyleSheet.create({
    label: {
      fontFamily: fonts.medium,
      fontSize: 14,
      letterSpacing: 1.4,
      color: colors.text,
      textAlign: "center",
    },
    input: {
      height: 48,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.sheetInput,
      backgroundColor: colors.white,
      paddingHorizontal: space(3),
      color: colors.ink,
      fontFamily: fonts.medium,
      fontSize: 17,
      letterSpacing: 1.4,
    },
    focused: { borderColor: colors.inputBlue },
  }),
  card: StyleSheet.create({
    label: { fontFamily: fonts.bold, fontSize: 15, color: "#3A3A3A" },
    input: {
      minHeight: 42,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.inputBlue,
      backgroundColor: colors.white,
      paddingHorizontal: space(3),
      color: colors.ink,
      fontFamily: fonts.semibold,
      fontSize: 14,
    },
    focused: { borderWidth: 2, paddingHorizontal: space(3) - 0.5 },
  }),
};
