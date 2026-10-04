import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { isView, type CalendarView } from "./calendar";

const KEY = "bookflow.calendar.view";
// Remembered for this run of the app straight away, and stored for the next one (Android only;
// the web target is for design captures).
let remembered: CalendarView | undefined;

/** The Calendar's List · Day · Week choice, remembered between visits. Day until chosen. */
export function useCalendarView(): [CalendarView, (view: CalendarView) => void] {
  const [view, setView] = useState<CalendarView>(remembered ?? "day");

  useEffect(() => {
    if (remembered || Platform.OS === "web") return;
    SecureStore.getItemAsync(KEY)
      .then((stored) => {
        if (isView(stored) && !remembered) {
          remembered = stored;
          setView(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const choose = (next: CalendarView) => {
    remembered = next;
    setView(next);
    if (Platform.OS !== "web") SecureStore.setItemAsync(KEY, next).catch(() => undefined);
  };
  return [view, choose];
}
