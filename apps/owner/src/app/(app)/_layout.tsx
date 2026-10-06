import { Stack } from "expo-router";
import { View } from "react-native";

import { ToastHost } from "../../ui";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {/* "Changes saved" after any edit screen, also once it has gone back (release 1.0.0). */}
      <ToastHost />
    </View>
  );
}
