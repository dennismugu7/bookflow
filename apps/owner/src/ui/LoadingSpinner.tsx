import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../theme";
import { useLoadingDelay } from "./ListSkeleton";

/**
 * A small centred spinner for a detail page or grid whose first load is in flight (QA 8663, M-01).
 * Like ListSkeleton, it waits SKELETON_DELAY_MS so a fast load doesn't flash it.
 */
export function LoadingSpinner({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const visible = useLoadingDelay();
  if (!visible) return null;
  return (
    <ActivityIndicator
      color={colors.action}
      accessibilityLabel={label}
      style={[styles.spinner, style]}
    />
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 40, alignSelf: "center" },
});
