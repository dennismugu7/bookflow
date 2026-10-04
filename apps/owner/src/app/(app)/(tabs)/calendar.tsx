import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { nextBookingId, type AgendaBooking } from "../../../lib/agenda";
import {
  columnsFor,
  headerLabel,
  rangeFor,
  scaleFor,
  shiftDate,
  type CalendarDay,
  type CalendarView,
} from "../../../lib/calendar";
import { clientHref, newBookingHref } from "../../../lib/routes";
import { useSession, type Membership } from "../../../lib/session";
import { ceilToMinutes, zonedParts, zonedTime } from "../../../lib/time";
import { useAgenda, useNow, useRangeAgenda } from "../../../lib/use-agenda";
import { useCalendarView } from "../../../lib/view-pref";
import { colors, fonts } from "../../../theme";
import { Chip, Fab } from "../../../ui";
import { DatePickerSheet } from "../../../ui/calendar/DatePickerSheet";
import { DayGrid } from "../../../ui/calendar/DayGrid";
import { CalendarHeader, ViewSwitch } from "../../../ui/calendar/parts";
import { WeekGrid } from "../../../ui/calendar/WeekGrid";
import { AgendaList, EmptyDayGaps } from "../../../ui/today/AgendaList";
import { BookingSheet } from "../../../ui/today/BookingSheet";
import { useBookingActions } from "../../../ui/today/useBookingActions";

export default function CalendarScreen() {
  const { membership } = useSession();
  if (!membership) return null;
  return <Calendar membership={membership} />;
}

/** The Calendar: List, Day (a column per person) and Week (owner-v4 01, 02). */
function Calendar({ membership }: { membership: Membership }) {
  const { salon } = membership;
  const timeZone = salon.timezone;
  const isOwner = membership.role === "owner";
  const viewer = { isOwner, staffId: membership.staffId };
  const now = useNow();
  const today = zonedParts(now, timeZone).date;
  const [view, setView] = useCalendarView();
  const [date, setDate] = useState(today);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [openId, setOpenId] = useState<string>();
  const [sheetId, setSheetId] = useState<string>();

  const { from, to } = rangeFor(view, date);
  const grid = useRangeAgenda(view === "list" ? undefined : salon.id, from, to);
  const list = useAgenda(view === "list" ? salon.id : undefined, date, {
    channel: "calendar-list",
    what: "the bookings",
  });
  const reload = view === "list" ? list.reload : grid.reload;
  const actions = useBookingActions(timeZone, reload, () => setOpenId(undefined));

  // Only show a range once it is the one asked for (the previous one stays loaded meanwhile).
  const range =
    grid.range && grid.range.days[0]?.date === from && grid.range.days.at(-1)?.date === to
      ? grid.range
      : undefined;
  const days: CalendarDay[] = range?.days ?? [];
  const scale = useMemo(() => scaleFor(days, timeZone), [days, timeZone]);

  const go = (direction: 1 | -1) => {
    setOpenId(undefined);
    setDate((d) => shiftDate(view, d, direction));
  };
  // Swipes call the latest `go`.
  const goRef = useRef(go);
  goRef.current = go;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) goRef.current(1);
          else if (g.dx > 50) goRef.current(-1);
        },
      }).panHandlers,
    [],
  );

  const sheetBooking = days.flatMap((d) => d.bookings).find((b) => b.id === sheetId);
  const sheetDay = days.find((d) => d.bookings.some((b) => b.id === sheetId));
  const openClient = (id: string) => router.push(clientHref(id));

  /** + : today's next quarter hour, or the first opening of another day. */
  function addBooking() {
    const day = days.find((d) => d.date === date);
    const start =
      date === today
        ? ceilToMinutes(now, 15)
        : zonedTime(date, day?.open[0]?.opens ?? "09:00", timeZone);
    router.push(newBookingHref({ start, from: "add" }));
  }

  const changeView = (next: CalendarView) => {
    setOpenId(undefined);
    setView(next);
  };

  const error = view === "list" ? list.error : grid.error;

  // A tapped notification (owner-v5 04): Day view on its date, then its sheet once that day has
  // been reloaded, if the booking is still on it (cancelled bookings are not).
  const reloadGrid = grid.reload;
  const tap = useLocalSearchParams<{ date?: string; booking?: string; at?: string }>();
  const [pendingTap, setPendingTap] = useState<{ at: string; booking?: string }>();
  const [handledTap, setHandledTap] = useState<string>();
  useEffect(() => {
    if (!tap.at || tap.at === handledTap || !tap.date) return;
    setHandledTap(tap.at);
    setOpenId(undefined);
    setSheetId(undefined);
    setView("day");
    setDate(tap.date);
    setPendingTap(undefined);
    const at = tap.at;
    const booking = tap.booking;
    void reloadGrid().then(() => setPendingTap({ at, booking }));
  }, [tap.at, tap.date, tap.booking, handledTap, setView, reloadGrid]);
  useEffect(() => {
    if (!pendingTap || !range || view !== "day" || days[0]?.date !== date) return;
    setPendingTap(undefined);
    if (pendingTap.booking && days[0].bookings.some((b) => b.id === pendingTap.booking))
      setSheetId(pendingTap.booking);
  }, [pendingTap, range, view, days, date]);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <CalendarHeader
        label={headerLabel(view, date, today)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onPickDate={() => setPicking(true)}
      />
      <ViewSwitch value={view} onChange={changeView} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {view === "list" ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} />
          }
          {...swipe}
        >
          {!list.agenda || list.agenda.date !== date ? null : list.agenda.bookings.length === 0 ? (
            <>
              <Text style={styles.none}>No bookings on this day.</Text>
              <EmptyDayGaps
                agenda={list.agenda}
                timeZone={timeZone}
                onFill={
                  isOwner
                    ? (start) => router.push(newBookingHref({ start, from: "gap" }))
                    : undefined
                }
              />
            </>
          ) : (
            <AgendaList
              agenda={list.agenda}
              timeZone={timeZone}
              now={now}
              viewer={viewer}
              slug={salon.slug}
              actions={actions}
              openId={openId}
              onToggle={(id) => setOpenId((open) => (open === id ? undefined : id))}
              onFill={
                isOwner ? (start) => router.push(newBookingHref({ start, from: "gap" })) : undefined
              }
              onOpenClient={openClient}
              label={date === today ? "Next up" : "Bookings"}
            />
          )}
        </ScrollView>
      ) : view === "day" ? (
        range && days[0] ? (
          <DayGrid
            day={days[0]}
            staff={range.staff}
            scale={scale}
            timeZone={timeZone}
            now={now}
            onOpenBooking={(b: AgendaBooking) => setSheetId(b.id)}
            onEmpty={
              isOwner
                ? (staffId, time) =>
                    router.push(
                      newBookingHref({
                        start: zonedTime(days[0]!.date, time, timeZone),
                        from: "gap",
                        staffId,
                      }),
                    )
                : undefined
            }
            swipe={swipe}
          />
        ) : (
          <View style={styles.flex} />
        )
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filters}
          >
            <Chip
              label="Everyone"
              role="radio"
              dense
              selected={staffFilter === null}
              onPress={() => setStaffFilter(null)}
            />
            {columnsFor(range?.staff ?? []).map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                role="radio"
                dense
                selected={staffFilter === s.id}
                onPress={() => setStaffFilter(s.id)}
              />
            ))}
          </ScrollView>
          {range ? (
            <WeekGrid
              days={days}
              scale={scale}
              timeZone={timeZone}
              today={today}
              now={now}
              staffId={staffFilter}
              onOpenDay={(d) => {
                setDate(d);
                changeView("day");
              }}
              swipe={swipe}
            />
          ) : (
            <View style={styles.flex} />
          )}
        </>
      )}

      {/* No + on the week (02). */}
      {isOwner && view !== "week" ? (
        <View style={styles.fab}>
          <Fab label="New booking" onPress={addBooking} />
        </View>
      ) : null}

      <BookingSheet
        booking={sheetBooking}
        timeZone={timeZone}
        now={now}
        nextId={sheetDay?.date === today ? nextBookingId(sheetDay.bookings, now) : undefined}
        viewer={viewer}
        actions={actions}
        onClose={() => setSheetId(undefined)}
        onOpenClient={openClient}
      />
      {actions.sheets()}
      <DatePickerSheet
        visible={picking}
        value={date}
        today={today}
        onClose={() => setPicking(false)}
        onPick={(d) => {
          setOpenId(undefined);
          setDate(d);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  error: {
    marginHorizontal: 20,
    marginTop: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  none: {
    marginTop: 32,
    textAlign: "center",
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.subtle,
  },
  filterScroll: { flexGrow: 0, marginTop: 11 },
  filters: { flexDirection: "row", gap: 16, paddingHorizontal: 20 },
  fab: { position: "absolute", right: 20, bottom: 24 },
});
