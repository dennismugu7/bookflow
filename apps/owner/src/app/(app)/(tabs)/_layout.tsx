import { initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "../../../lib/session";
import { colors, fonts } from "../../../theme";

type IconProps = { color: ColorValue; focused: boolean };

// Icons, colours and the avatar Menu tab follow owner-v2 08.
const TodayIcon = ({ color }: IconProps) => <Feather name="file-text" size={23} color={color} />;
const CalendarIcon = ({ color }: IconProps) => <Feather name="calendar" size={23} color={color} />;
const ClientsIcon = ({ color }: IconProps) => <Feather name="user" size={23} color={color} />;

/** A 28 px avatar circle with the owner's initial, ringed in blue while the tab is active. */
function MenuIcon({ focused }: IconProps) {
  const { session } = useSession();
  return (
    <View style={[styles.ring, focused && styles.ringActive]}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{initialsFor(session?.user.email)}</Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontFamily: fonts.regular, fontSize: 13 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.hairline,
          height: 72 + insets.bottom,
        },
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: TodayIcon }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: CalendarIcon }} />
      <Tabs.Screen name="clients" options={{ title: "Clients", tabBarIcon: ClientsIcon }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: MenuIcon }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  ringActive: { borderColor: colors.action },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.menuGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
});
