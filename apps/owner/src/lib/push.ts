import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { phonePermission, type PhonePermission } from "./notification-prefs";
import { getSupabase } from "./supabase";

// Push is Android only; the web target exists for design captures.
const supported = Platform.OS === "android";
const INTRO_KEY = "bookflow.notifications.introShown";

let registeredToken: string | undefined;

/** Banner and sound while the app is open too, and the high-importance "bookings" channel. */
export function setUpNotifications(): void {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  void Notifications.setNotificationChannelAsync("bookings", {
    name: "Bookings",
    importance: Notifications.AndroidImportance.HIGH,
  }).catch(() => undefined);
}

export async function getPhonePermission(): Promise<PhonePermission> {
  if (!supported) return "blocked";
  try {
    return phonePermission(await Notifications.getPermissionsAsync());
  } catch {
    return "blocked";
  }
}

/** Android's own prompt. */
export async function askPhonePermission(): Promise<PhonePermission> {
  if (!supported) return "blocked";
  try {
    return phonePermission(await Notifications.requestPermissionsAsync());
  } catch {
    return "blocked";
  }
}

/**
 * Sends this phone's Expo push token to the database, when the permission is granted. A build
 * without google-services.json (local runs) has no token: push is then simply unavailable.
 */
export async function registerThisPhone(): Promise<void> {
  if (!supported || (await getPhonePermission()) !== "granted") return;
  try {
    const token = await expoToken();
    const { error } = await getSupabase().rpc("register_push_token", { p_token: token });
    if (!error) registeredToken = token;
  } catch {
    // No Firebase config or no network: try again on the next start.
  }
}

/** Before signing out, so this phone stops getting the salon's alerts. */
export async function unregisterThisPhone(): Promise<void> {
  if (!supported) return;
  try {
    const token =
      registeredToken ?? ((await getPhonePermission()) === "granted" ? await expoToken() : null);
    registeredToken = undefined;
    if (!token) return;
    // Never hold up signing out for long on a bad connection.
    await Promise.race([
      getSupabase().rpc("unregister_push_token", { p_token: token }),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {
    // Signing out goes ahead; the token moves on when someone registers this phone again.
  }
}

async function expoToken(): Promise<string> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export async function introShown(): Promise<boolean> {
  if (!supported) return true;
  try {
    return (await SecureStore.getItemAsync(INTRO_KEY)) === "1";
  } catch {
    return true;
  }
}

export async function markIntroShown(): Promise<void> {
  if (!supported) return;
  await SecureStore.setItemAsync(INTRO_KEY, "1").catch(() => undefined);
}

/** After deleting the account: this phone shows the notifications intro again for a new owner. */
export async function forgetIntroShown(): Promise<void> {
  if (!supported) return;
  await SecureStore.deleteItemAsync(INTRO_KEY).catch(() => undefined);
}
