import type { ReactNode } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { brandBackground } from "./illustrations";

/** The indigo gradient behind the splash, welcome and sign-in sheet (01–05), filling the screen. */
export function BrandBackdrop({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.fill, style]}>
      <Image source={brandBackground} resizeMode="cover" accessible={false} style={styles.image} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#2A1E86" },
  // Explicit size: otherwise the web target lays the image out at its pixel size.
  image: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
});
