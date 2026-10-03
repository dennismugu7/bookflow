import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { colors, fonts } from "../../../theme";

type IconName = ComponentProps<typeof Feather>["name"];

const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => <Feather name={name} size={22} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("file-text") }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: icon("calendar") }} />
      <Tabs.Screen name="clients" options={{ title: "Clients", tabBarIcon: icon("users") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("user") }} />
    </Tabs>
  );
}
