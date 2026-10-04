import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { shouldShowIntro } from "./notification-prefs";
import { notificationTarget, type NotificationTarget } from "./notification-target";
import { getPhonePermission, introShown, markIntroShown, registerThisPhone } from "./push";
import { zonedParts } from "./time";

// The web target (design captures) has no notifications.
const useLastResponse =
  Platform.OS === "android" ? Notifications.useLastNotificationResponse : () => undefined;

/** Today, or the Calendar's Day view, on that booking (owner-v5 04). `at` makes each tap new. */
export function openTarget(target: NotificationTarget): void {
  const params: Record<string, string> = { at: String(Date.now()) };
  if (target.bookingId) params.booking = target.bookingId;
  if (target.screen === "today") router.navigate({ pathname: "/", params });
  else router.navigate({ pathname: "/calendar", params: { ...params, date: target.date } });
}

/**
 * Runs once the tabs are showing: registers this phone (or shows "Turn on notifications" the first
 * time), and opens the booking of a tapped notification, whether the tap started the app or not.
 */
export function useNotifications(timeZone: string): void {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let active = true;
    void (async () => {
      const permission = await getPhonePermission();
      if (permission === "granted") {
        await registerThisPhone();
        return;
      }
      if (active && shouldShowIntro(await introShown(), permission)) {
        await markIntroShown();
        if (active) router.push("/allow-notifications");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const response = useLastResponse();
  useEffect(() => {
    if (!response) return;
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    const today = zonedParts(new Date(), timeZone).date;
    const target = notificationTarget(response.notification.request.content.data, today);
    if (target) openTarget(target);
  }, [response, timeZone]);
}
