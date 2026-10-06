import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { parseAgenda, type Agenda } from "./agenda";
import { parseRange, type RangeAgenda } from "./calendar";
import { getSupabase } from "./supabase";

/** The clock, ticking once a minute so Next and the action timing rules stay current. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Calls `onChange` whenever a booking in the salon changes (realtime; RLS decides who hears about
 * what). Each screen uses its own channel name, since the tabs stay mounted side by side.
 */
export function useBookingChanges(
  salonId: string | undefined,
  channelName: string,
  onChange: () => void,
) {
  useEffect(() => {
    if (!salonId) return;
    const supabase = getSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`${channelName}:${salonId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `salon_id=eq.${salonId}` },
        () => {
          // A booking often changes in a burst (hold, then confirm); refetch once.
          clearTimeout(timer);
          timer = setTimeout(onChange, 400);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [salonId, channelName, onChange]);
}

/**
 * Loads with `fetch` on focus, on pull to refresh, whenever `fetch` changes, and on booking
 * changes. Only the latest request may update the screen.
 */
function useLiveLoad<T>(
  salonId: string | undefined,
  channelName: string,
  fetch: (() => Promise<T>) | undefined,
  messages: { load: string; read: string },
) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!fetch) return;
    const request = ++latest.current;
    let result: T;
    try {
      result = await fetch();
    } catch (e) {
      if (request !== latest.current) return;
      setError(e instanceof LoadError ? messages.load : messages.read);
      return;
    }
    if (request !== latest.current) return;
    setData(result);
    setError(undefined);
  }, [fetch, messages.load, messages.read]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useBookingChanges(salonId, channelName, load);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { data, error, refreshing, refresh, reload: load };
}

class LoadError extends Error {}

/** One day's agenda for a salon (get_day_agenda): Today, and the Calendar's List view. */
export function useAgenda(
  salonId: string | undefined,
  date: string,
  options: { channel?: string; what?: string } = {},
) {
  const { channel = "today", what = "today's bookings" } = options;
  const fetch = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("get_day_agenda", {
      p_salon_id: salonId!,
      p_date: date,
    });
    if (error || !data) throw new LoadError();
    return parseAgenda(data);
  }, [salonId, date]);
  const { data, ...rest } = useLiveLoad<Agenda>(salonId, channel, salonId ? fetch : undefined, {
    load: `Couldn't load ${what}. Check your connection.`,
    read: `Couldn't read ${what}. Update the app and try again.`,
  });
  return { agenda: data, ...rest };
}

/** A day or a week for the Calendar (get_range_agenda). */
export function useRangeAgenda(salonId: string | undefined, from: string, to: string) {
  const fetch = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("get_range_agenda", {
      p_salon_id: salonId!,
      p_from: from,
      p_to: to,
    });
    if (error || !data) throw new LoadError();
    return parseRange(data);
  }, [salonId, from, to]);
  const { data, ...rest } = useLiveLoad<RangeAgenda>(
    salonId,
    "calendar",
    salonId ? fetch : undefined,
    {
      load: "Couldn't load the calendar. Check your connection and try again.",
      read: "Couldn't read the calendar. Update the app and try again.",
    },
  );
  return { range: data, ...rest };
}
