import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme";
import { Button } from "./Button";
import { TopBar, type BarAction } from "./TopBar";

type Props = {
  title: string;
  onBack?: () => void;
  right?: BarAction;
  children: ReactNode;
  /** Pinned under the content, e.g. a SaveBar. */
  footer?: ReactNode;
  /** The round add button, bottom right. */
  fab?: ReactNode;
  /** Page padding; the screens with full-width content (My brand) use 0. */
  padding?: number;
  gap?: number;
};

/**
 * A white owner page: the fixed TopBar, content that scrolls underneath it, and an optional
 * footer and add button. Nothing floats over the content except the add button.
 */
export function Page({
  title,
  onBack,
  right,
  children,
  footer,
  fab,
  padding = 20,
  gap = 18,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <TopBar title={title} onBack={onBack} right={right} />
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { padding, gap, paddingBottom: fab ? 120 : footer ? 24 : 24 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
      {fab ? <View style={[styles.fab, { bottom: 28 + insets.bottom }]}>{fab}</View> : null}
    </View>
  );
}

type SaveBarProps = {
  title: string;
  onPress: () => void;
  /** Off until something changes. */
  disabled?: boolean;
  loading?: boolean;
};

/** The black full-width save button in a fixed bottom bar (owner-v2 01, 03, 06). */
export function SaveBar({ title, onPress, disabled, loading }: SaveBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.saveBar, { paddingBottom: 24 + insets.bottom }]}>
      <Button title={title} onPress={onPress} disabled={disabled} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  fab: { position: "absolute", right: 20 },
  saveBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
