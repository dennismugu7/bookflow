import { useRef, type ReactElement } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderHandlers,
  type RefreshControlProps,
} from "react-native";

import { nextBookingId, type AgendaBooking } from "../../lib/agenda";
import {
  blockName,
  blockServices,
  blockTone,
  columnsFor,
  hourMarks,
  isClosed,
  isShortBlock,
  minuteOfDay,
  nowMinute,
  placeOnScale,
  timeAt,
  timeOffLabel,
  type CalendarDay,
  type CalendarStaff,
  type Scale,
} from "../../lib/calendar";
import { clockTime } from "../../lib/time";
import { colors, fonts } from "../../theme";
import { GUTTER, HOUR, Hatch, LINE_INSET, StaffAvatar, TONES } from "./parts";

const COLUMN = 104;
const COLUMN_GAP = 6;
/** The scale starts 5 pt under the header line (01). */
const TOP = 5;
const BOTTOM = 110;

type Props = {
  day: CalendarDay;
  staff: CalendarStaff[];
  scale: Scale;
  timeZone: string;
  now: Date;
  onOpenBooking: (booking: AgendaBooking) => void;
  /** Empty space: a new booking for that person at the nearest quarter hour. */
  onEmpty?: (staffId: string, time: string) => void;
  swipe: GestureResponderHandlers;
  /** Pull to refresh (release 1.0.0 part 2), a backup to live updates. */
  refreshControl?: ReactElement<RefreshControlProps>;
};

/** One column per active team member, with bookings, time off and the now-line (owner-v4 01). */
export function DayGrid({
  day,
  staff,
  scale,
  timeZone,
  now,
  onOpenBooking,
  onEmpty,
  swipe,
  refreshControl,
}: Props) {
  const columns = columnsFor(staff);
  const scrolls = columns.length > 3;
  const header = useRef<ScrollView>(null);
  const height = ((scale.end - scale.start) / 60) * HOUR;
  const nextId = nextBookingId(day.bookings, now);
  const nowAt = nowMinute(day.date, now, timeZone, scale);
  const closed = isClosed(day);
  const width = columns.length * COLUMN + Math.max(0, columns.length - 1) * COLUMN_GAP;

  const heads = (
    <View style={[styles.heads, { width }]}>
      {columns.map((s) => (
        <View key={s.id} style={styles.head}>
          <StaffAvatar name={s.name} photoPath={s.photo_path} size={34} />
          <Text style={styles.headName} numberOfLines={1}>
            {s.name}
          </Text>
        </View>
      ))}
    </View>
  );

  const body = (
    <View style={[styles.columns, { width, height }]}>
      {columns.map((s) => (
        <Column
          key={s.id}
          staffId={s.id}
          name={s.name}
          day={day}
          scale={scale}
          height={height}
          timeZone={timeZone}
          nextId={nextId}
          closed={closed}
          onOpenBooking={onOpenBooking}
          onEmpty={onEmpty}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.headRow}>
        {scrolls ? (
          <ScrollView
            horizontal
            ref={header}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
          >
            {heads}
          </ScrollView>
        ) : (
          heads
        )}
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
          <View style={[styles.body, { top: TOP }]}>
            {scrolls ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) =>
                  header.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false })
                }
              >
                {body}
              </ScrollView>
            ) : (
              body
            )}
          </View>
          {nowAt !== undefined ? (
            <View
              pointerEvents="none"
              style={[styles.now, { top: TOP + ((nowAt - scale.start) / 60) * HOUR - 1 }]}
            >
              <View style={styles.nowDot} />
              <View style={styles.nowLine} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Column({
  staffId,
  name,
  day,
  scale,
  height,
  timeZone,
  nextId,
  closed,
  onOpenBooking,
  onEmpty,
}: {
  staffId: string;
  name: string;
  day: CalendarDay;
  scale: Scale;
  height: number;
  timeZone: string;
  nextId: string | undefined;
  closed: boolean;
  onOpenBooking: (booking: AgendaBooking) => void;
  onEmpty?: (staffId: string, time: string) => void;
}) {
  const minute = (iso: string) => minuteOfDay(iso, day.date, timeZone);
  const column = useRef<View>(null);
  // pageY minus the column's own top works on Android and the web target alike.
  const tapAt = (pageY: number) =>
    column.current?.measure((_x, _y, _w, _h, _pageX, top) =>
      onEmpty?.(staffId, timeAt(pageY - top, scale, HOUR)),
    );
  return (
    <View ref={column} style={[styles.column, { height }]} collapsable={false}>
      {closed ? <View style={styles.closed} pointerEvents="none" /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`New booking with ${name}`}
        disabled={!onEmpty}
        onPress={(e) => tapAt(e.nativeEvent.pageY)}
        style={StyleSheet.absoluteFill}
      />
      {day.time_off
        .filter((off) => off.staff_id === staffId)
        .map((off) => {
          const place = placeOnScale(minute(off.starts_at), minute(off.ends_at), scale, HOUR);
          if (!place) return null;
          return (
            <View
              key={`${off.starts_at}-${off.ends_at}`}
              pointerEvents="none"
              style={[styles.off, { top: place.top, height: place.height - 4 }]}
              accessibilityLabel={timeOffLabel(off, day.date, timeZone)}
            >
              <Hatch height={place.height} />
              <Text style={styles.offText}>{timeOffLabel(off, day.date, timeZone)}</Text>
            </View>
          );
        })}
      {day.bookings
        .filter((b) => b.staff_id === staffId)
        .map((b) => {
          const place = placeOnScale(minute(b.starts_at), minute(b.ends_at), scale, HOUR);
          if (!place) return null;
          const tone = TONES[blockTone(b, nextId)];
          const minutes = (Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60_000;
          const span = `${clockTime(b.starts_at, timeZone)}–${clockTime(b.ends_at, timeZone)}`;
          return (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`${span}, ${blockName(b)}, ${blockServices(b)}`}
              onPress={() => onOpenBooking(b)}
              style={({ pressed }) => [
                styles.block,
                {
                  top: place.top,
                  height: Math.max(place.height - 4, 18),
                  backgroundColor: tone.fill,
                  borderLeftColor: tone.bar,
                },
                b.status === "no_show" && styles.noShow,
                pressed && styles.pressed,
              ]}
            >
              {isShortBlock(b) ? (
                <Text style={styles.blockText} numberOfLines={1}>
                  <Text style={styles.blockName}>{blockName(b)}</Text> · {blockServices(b)}
                </Text>
              ) : (
                <Text style={styles.blockName} numberOfLines={1}>
                  {blockName(b)}
                </Text>
              )}
              {!isShortBlock(b) && place.height >= 30 ? (
                <Text style={styles.blockText} numberOfLines={1}>
                  {blockServices(b)}
                </Text>
              ) : null}
              {minutes > 90 ? <Text style={styles.blockText}>{span}</Text> : null}
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headRow: { marginLeft: GUTTER, marginRight: 14, marginTop: 16 },
  heads: { flexDirection: "row", gap: COLUMN_GAP },
  head: { width: COLUMN, alignItems: "center" },
  headName: {
    marginTop: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.ink,
  },
  headLine: {
    marginTop: 6,
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
  body: { position: "absolute", left: GUTTER, right: 14 },
  columns: { flexDirection: "row", gap: COLUMN_GAP },
  column: { width: COLUMN },
  closed: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.softFill,
    borderRadius: 8,
  },
  off: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.softFill,
    paddingHorizontal: 7,
    paddingTop: 5,
  },
  offText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, color: colors.subtle },
  block: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingLeft: 7,
    paddingRight: 4,
    paddingTop: 5,
    overflow: "hidden",
  },
  noShow: { opacity: 0.7 },
  blockName: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.ink },
  blockText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, color: colors.ink },
  pressed: { opacity: 0.7 },
  now: {
    position: "absolute",
    left: 41,
    right: LINE_INSET,
    height: 8,
    marginTop: -3,
    flexDirection: "row",
    alignItems: "center",
  },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.required },
  nowLine: { flex: 1, height: 2, backgroundColor: colors.required },
});
