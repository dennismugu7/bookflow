import { StyleSheet, Text, View } from "react-native";

import { colors, space, type } from "../theme";
import { Button } from "./Button";

/**
 * A list that couldn't load (release 1.0.0 part 2, B): the reason and Try again, in place of the
 * list, so a failed load never reads as "No bookings yet".
 */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={styles.message}>{message}</Text>
      <Button title="Try again" variant="outline" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space(3), paddingVertical: space(6) },
  message: { ...type.body, color: colors.danger, textAlign: "center" },
});
