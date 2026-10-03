import { StyleSheet, View, type ViewProps } from "react-native";

import { colors, radius, space } from "../theme";

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius, padding: space(4), gap: space(2) },
});
