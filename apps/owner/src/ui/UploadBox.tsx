import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, space } from "../theme";

type Props = {
  label: string;
  uri?: string;
  busy?: boolean;
  height?: number;
  onPress: () => void;
};

/** "Upload image" box with the Field outline (owner-v2); shows the photo once there is one. */
export function UploadBox({ label, uri, busy = false, height = 87, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={uri ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
      onPress={onPress}
      disabled={busy}
      style={[styles.box, { height }]}
    >
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {busy ? (
        <View style={uri ? styles.badge : undefined} accessibilityLabel="Uploading">
          <ActivityIndicator color={uri ? colors.white : colors.action} />
        </View>
      ) : !uri ? (
        <>
          <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={colors.subtle} />
          <Text style={styles.text}>Upload image</Text>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.field,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: space(2),
    backgroundColor: colors.white,
  },
  text: { fontFamily: fonts.regular, fontSize: 16, color: colors.faint },
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
