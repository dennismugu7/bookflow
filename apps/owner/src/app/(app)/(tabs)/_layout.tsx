import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "../../../theme";

type IconProps = { color: ColorValue };

// Icons and colours follow the tab bar in designs 12–14.
const TodayIcon = ({ color }: IconProps) => (
  <MaterialCommunityIcons name="clipboard-list-outline" size={28} color={color} />
);
const CalendarIcon = ({ color }: IconProps) => (
  <Ionicons name="calendar-number-outline" size={26} color={color} />
);
const ClientsIcon = ({ color }: IconProps) => <Feather name="users" size={25} color={color} />;
const AccountIcon = ({ color }: IconProps) => (
  <MaterialCommunityIcons name="account-circle-outline" size={28} color={color} />
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2F6BD8",
        tabBarInactiveTintColor: "#6B6B6B",
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 15 },
        tabBarStyle: {
          backgroundColor: "#FAFAFA",
          borderTopColor: "#EFEFEF",
          height: 72 + insets.bottom,
        },
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: TodayIcon }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: CalendarIcon }} />
      <Tabs.Screen name="clients" options={{ title: "Clients", tabBarIcon: ClientsIcon }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: AccountIcon }} />
    </Tabs>
  );
}
