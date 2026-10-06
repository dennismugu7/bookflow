import type { ReactElement } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderHandlers,
  type RefreshControlProps,
} from "react-native";

import { nextBookingId } from "../../lib/agenda";
import {
  blockTone,
  bookingsFor,
  hourMarks,
  isClosed,
  lanes,
  minuteOfDay,
  placeOnScale,
  weekdayHead,
  type CalendarDay,
  type Scale,
} from "../../lib/calendar";
import { colors, fonts } from "../../theme";
import { GUTTER, HOUR, LINE_INSET, TONES } from "./parts";

/** 02: seven columns from 52 pt to the right edge; blocks leave 4 pt between days. */
const PITCH = (390 - GUTTER) / 7;
const BLOCK = PITCH - 4;
const TOP = 5;
const BOTTOM = 40;

type Props = {
  days: CalendarDay[];
  scale: Scale;
  timeZone: string;
  today: string;
  now: Date;
  /** null = Everyone. */
  staffId: string | null;
  onOpenDay: (date: string) => void;
  swipe: GestureResponderHandlers;
  /** Pull to refresh (release 1.0.0 part 2), a backup to live updates. */
  refreshControl?: ReactElement<RefreshControlProps>;
};

/** Monday to Sunday side by side, closed days greyed (owner-v4 02). Tap a day to open it. */
export function WeekGrid({
  days,
  scale,
  timeZone,
  today,
  now,
  staffId,
  onOpenDay,
  swipe,
  refreshControl,
}: Props) {
  const height = ((scale.end - scale.start) / 60) * HOUR;
  return (
    <View style={styles.flex}>
      <View style={styles.heads}>
        {days.map((d) => {
          const head = weekdayHead(d.date);
          const isToday = d.date === today;
          return (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityLabel={`Open ${head.weekday} ${head.day}`}
              onPress={() => onOpenDay(d.date)}
              style={styles.head}
            >
              <Text style={[styles.weekday, isToday && styles.today]}>{head.weekday}</Text>
              <Text style={[styles.dayNumber, isToday && styles.today]}>{head.day}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.headLine} />
      <ScrollView style={styles.flex} refreshControl={refreshControl} {...swipe}>
        <View style={{ height: TOP + height + BOTTOM }}>
          {hourMarks(scale).map((mark, i) => (
            <View key={mark} style={[styles.hour, { top: TOP + i * HOUR }]}>
              <View style={styles.hourLine} />
              <Text style={styles.hourText}>{mark}</Text>
            </View>
          ))}
          {days.map((d, i) => {
            const bookings = bookingsFor(d, staffId);
            const nextId = d.date === today ? nextBookingId(d.bookings, now) : undefined;
            const placed = lanes(bookings);
            const minute = (iso: string) => minuteOfDay(iso, d.date, timeZone);
            const head = weekdayHead(d.date);
            return (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                accessibilityLabel={`${head.weekday} ${head.day}: ${
                  isClosed(d) ? "closed" : `${bookings.length} bookings`
                }. Open the day`}
                onPress={() => onOpenDay(d.date)}
                style={[styles.column, { left: GUTTER + i * PITCH, top: TOP, height }]}
              >
                {isClosed(d) ? (
                  <View style={styles.closed}>
                    <Text style={styles.closedText}>Closed</Text>
                  </View>
                ) : null}
                {bookings.map((b) => {
                  const place = placeOnScale(minute(b.starts_at), minute(b.ends_at), scale, HOUR);
                  if (!place) return null;
                  const tone = TONES[blockTone(b, nextId)];
                  const lane = placed.get(b.id) ?? { lane: 0, of: 1 };
                  const width = BLOCK / lane.of;
                  return (
                    <View
                      key={b.id}
                      pointerEvents="none"
                      style={[
                        styles.block,
                        {
                          top: place.top,
                          height: Math.max(place.height - 4, 10),
                          left: lane.lane * width,
                          width: width - (lane.of > 1 ? 1 : 0),
                          backgroundColor: tone.fill,
                          borderLeftColor: tone.bar,
                        },
                      ]}
                    />
                  );
                })}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 02 centres the day names 12 pt left of the blocks under them.
  heads: { flexDirection: "row", marginLeft: GUTTER - 12, marginTop: 15 },
  head: { width: PITCH, alignItems: "center" },
  weekday: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, color: colors.ink },
  dayNumber: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.ink },
  today: { color: colors.action },
  headLine: {
    marginTop: 7,
    marginHorizontal: LINE_INSET,
    height: 1,
    backgroundColor: colors.hairline,
  },
  hour: { position: "absolute", left: LINE_INSET, right: LINE_INSET },
  hourLine: { height: 1, backgroundColor: colors.hairline },
  hourText: {
    marginLeft: 2,
    marginTop: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.faint,
  },
  column: { position: "absolute", width: PITCH },
  closed: {
    position: "absolute",
    left: 0,
    width: BLOCK,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: colors.softFill,
    alignItems: "center",
    justifyContent: "center",
  },
  closedText: { fontFamily: fonts.regular, fontSize: 11, color: colors.faint },
  block: { position: "absolute", borderRadius: 8, borderLeftWidth: 3 },
});
