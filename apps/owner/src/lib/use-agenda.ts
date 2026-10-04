import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { parseAgenda, type Agenda } from "./agenda";
import { getSupabase } from "./supabase";
import { zonedParts } from "./time";

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
 * Today's agenda for a salon: loaded on focus, on pull to refresh, and whenever a booking in the
 * salon changes (realtime; RLS decides who hears about what).
 */
export function useAgenda(salonId: string | undefined, timeZone: string, now: Date) {
  const date = zonedParts(now, timeZone).date;
  const [agenda, setAgenda] = useState<Agenda>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest request may update the screen.
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!salonId) return;
    const request = ++latest.current;
    const { data, error: loadError } = await getSupabase().rpc("get_day_agenda", {
      p_salon_id: salonId,
      p_date: date,
    });
    if (request !== latest.current) return;
    if (loadError || !data) {
      setError("Couldn't load today's bookings. Pull down to try again.");
      return;
    }
    try {
      setAgenda(parseAgenda(data));
      setError(undefined);
    } catch {
      setError("Couldn't read today's bookings. Update the app and try again.");
    }
  }, [salonId, date]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!salonId) return;
    const supabase = getSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`today:${salonId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `salon_id=eq.${salonId}` },
        () => {
          // A booking often changes in a burst (hold, then confirm); refetch once.
          clearTimeout(timer);
          timer = setTimeout(() => void load(), 400);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [salonId, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { agenda, error, refreshing, refresh, reload: load };
}
