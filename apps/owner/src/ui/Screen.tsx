import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { colors, space } from "../theme";

type Props = {
  children: ReactNode;
  /** Pinned to the bottom, e.g. the screen's main button. */
  footer?: ReactNode;
  /** Tab screens sit above the tab bar, so they skip the bottom inset. */
  edges?: Edge[];
};

/** Safe-area page with scrolling content, keyboard avoidance and an optional pinned footer. */
export function Screen({ children, footer, edges = ["top", "bottom"] }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: space(5), gap: space(5) },
  footer: {
    paddingHorizontal: space(5),
    paddingBottom: space(5),
    paddingTop: space(2),
    gap: space(3),
  },
});
