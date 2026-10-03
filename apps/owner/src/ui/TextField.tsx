import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, controlHeight, fonts, radius, space, type } from "../theme";

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, onFocus, onBlur, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.muted}
        style={[styles.input, focused && styles.focused, !!error && styles.invalid, style]}
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
  invalid: { borderColor: colors.danger },
  error: { ...type.caption, color: colors.danger },
  hint: { ...type.caption, color: colors.muted },
});
