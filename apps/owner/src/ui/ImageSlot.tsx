import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, space } from "../theme";

type Props = {
  label: string;
  uri?: string;
  shape: "square" | "circle" | "banner";
  busy?: boolean;
  onPress: () => void;
};

/** Tap to pick a photo; shows the current image or a dashed "+" placeholder. */
export function ImageSlot({ label, uri, shape, busy = false, onPress }: Props) {
  const shapeStyle =
    shape === "banner" ? styles.banner : shape === "circle" ? styles.circle : styles.square;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={uri ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
      onPress={onPress}
      disabled={busy}
      style={[styles.base, shapeStyle, !uri && styles.empty]}
    >
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {busy && uri ? (
        // Keep the picked photo visible while it uploads; just mark the slot as busy.
        <View style={styles.badge} accessibilityLabel="Uploading">
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      ) : busy ? (
        <ActivityIndicator color={colors.brand} />
      ) : !uri ? (
        <View style={styles.placeholder}>
          <Feather name="plus" size={22} color={colors.muted} />
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  empty: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderStrong },
  square: { width: 96, height: 96, borderRadius: radius },
  circle: { width: 72, height: 72, borderRadius: 36 },
  banner: { width: "100%", aspectRatio: 16 / 7, borderRadius: radius },
  placeholder: { alignItems: "center", gap: space(1) },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  badge: {
    position: "absolute",
    right: space(2),
    bottom: space(2),
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(22, 19, 31, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
});
