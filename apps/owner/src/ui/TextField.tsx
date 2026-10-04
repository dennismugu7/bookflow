import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, controlHeight, fonts, radius, space, type } from "../theme";

type Variant = "default" | "sheet";

type Props = TextInputProps & {
  label: string;
  /** Hides the visible label (the input keeps it for screen readers). */
  hideLabel?: boolean;
  /** Adds the red "*" after the label. */
  required?: boolean;
  error?: string;
  hint?: string;
  /** Shows "84 / 500" under a field with a maxLength. */
  counter?: boolean;
  /** "default": the owner Field (owner-v2); "sheet": light-blue sign-in field (03–05). */
  variant?: Variant;
};

/**
 * The owner Field: a 15/600 label over a 52 px field with a grey outline at rest that turns
 * blue while typing (owner-v2 01, 03, 06). Multi-line fields are 120 px high.
 */
export function TextField({
  label,
  hideLabel = false,
  required = false,
  error,
  hint,
  counter = false,
  variant = "default",
  multiline,
  maxLength,
  value,
  onFocus,
  onBlur,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const v = variants[variant];
  return (
    <View style={styles.wrapper}>
      {hideLabel ? null : (
        <Text style={v.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      )}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={placeholders[variant]}
        multiline={multiline}
        maxLength={maxLength}
        value={value}
        style={[
          v.input,
          multiline && variant === "default" && styles.multiline,
          focused && v.focused,
          !!error && styles.invalid,
          style,
        ]}
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
      {counter && maxLength ? (
        <Text style={styles.counter}>
          {value?.length ?? 0} / {maxLength}
        </Text>
      ) : null}
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
  required: { color: colors.required },
  multiline: { height: 120, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  invalid: { borderColor: colors.danger },
  counter: { ...type.caption, fontSize: 14, color: colors.subtle, textAlign: "right" },
  error: { ...type.caption, color: colors.danger },
  hint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.subtle },
});

const placeholders: Record<Variant, string> = {
  default: colors.faint,
  sheet: "#A9A9A9",
};

const variants = {
  default: StyleSheet.create({
    label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
    input: {
      height: controlHeight,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.field,
      backgroundColor: colors.white,
      paddingHorizontal: space(4),
      color: colors.ink,
      fontFamily: fonts.regular,
      fontSize: 17,
    },
    // One pixel less padding keeps the text still when the border thickens.
    focused: { borderColor: colors.action, borderWidth: 2, paddingHorizontal: space(4) - 1 },
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
};
