import { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { sanitizeCode } from "../lib/auth-errors";
import { colors, fonts, radius, space } from "../theme";

const LENGTH = 6;

type Props = {
  value: string;
  onChange: (code: string) => void;
  /** Called once all 6 digits are in, typed or pasted. */
  onComplete: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
};

/** Six boxes backed by one input, so paste, autofill and backspace behave like a normal field. */
export function CodeInput({ value, onChange, onComplete, error = false, disabled = false }: Props) {
  const input = useRef<TextInput>(null);
  const active = Math.min(value.length, LENGTH - 1);

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={styles.row}>
      {Array.from({ length: LENGTH }, (_, index) => (
        <View
          key={index}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.box,
            index === active && !disabled && styles.activeBox,
            error && styles.errorBox,
          ]}
        >
          <Text style={styles.digit}>{value[index] ?? ""}</Text>
        </View>
      ))}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          const code = sanitizeCode(text);
          onChange(code);
          if (code.length === LENGTH) onComplete(code);
        }}
        editable={!disabled}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        accessibilityLabel="6-digit code"
        caretHidden
        contextMenuHidden={false}
        style={styles.input}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space(2) },
  box: {
    flex: 1,
    height: 56,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  activeBox: { borderColor: colors.select, borderWidth: 2 },
  errorBox: { borderColor: colors.danger },
  digit: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  // Covers the boxes, nearly invisible, so taps and long-press paste reach the real input.
  input: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.02,
    color: "transparent",
  },
});
