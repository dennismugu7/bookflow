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

/** Blue-outlined "Upload image" box (46, 51); shows the photo once there is one. */
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
          <ActivityIndicator color={uri ? colors.white : colors.inputBlue} />
        </View>
      ) : !uri ? (
        <>
          <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={colors.ink} />
          <Text style={styles.text}>Upload image</Text>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderColor: colors.inputBlue,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: space(2),
    backgroundColor: colors.white,
  },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.placeholder },
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
