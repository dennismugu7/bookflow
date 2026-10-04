import { initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { BlockTone, CalendarView } from "../../lib/calendar";
import { avatarTint } from "../../lib/display";
import { publicMediaUrl } from "../../lib/media";
import { colors, fonts, minTouch } from "../../theme";

/** Points per hour on the Day and Week scales (owner-v4 01, 02). */
export const HOUR = 70;
/** The time labels' column; the hour lines run from 12 pt in to 12 pt from the right. */
export const GUTTER = 52;
export const LINE_INSET = 12;

export const TONES: Record<BlockTone, { fill: string; bar: string }> = {
  done: { fill: colors.doneTint, bar: colors.success },
  next: { fill: colors.attentionSoft, bar: colors.attention },
  upcoming: { fill: colors.actionTint, bar: colors.action },
  noShow: { fill: colors.softFill, bar: colors.borderStrong },
};

/** ‹ Today · Sat 3 Oct › (01, 02): the label opens the date picker. */
export function CalendarHeader({
  label,
  onPrev,
  onNext,
  onPickDate,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onPickDate: () => void;
}) {
  return (
    <View style={styles.header}>
      <Arrow name="chevron-left" label="Previous" onPress={onPrev} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. Pick a date`}
        onPress={onPickDate}
        style={({ pressed }) => [styles.labelButton, pressed && styles.pressed]}
      >
        <Text style={styles.label} numberOfLines={1} accessibilityRole="header">
          {label}
        </Text>
      </Pressable>
      <Arrow name="chevron-right" label="Next" onPress={onNext} />
    </View>
  );
}

function Arrow({
  name,
  label,
  onPress,
}: {
  name: "chevron-left" | "chevron-right";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      <Feather name={name} size={20} color={colors.ink} />
    </Pressable>
  );
}

const VIEW_LABELS: Record<CalendarView, string> = { list: "List", day: "Day", week: "Week" };

/** The List · Day · Week switch (01, 02). */
export function ViewSwitch({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}) {
  return (
    <View style={styles.switch} accessibilityRole="tablist">
      {(Object.keys(VIEW_LABELS) as CalendarView[]).map((view) => {
        const selected = view === value;
        return (
          <Pressable
            key={view}
            accessibilityRole="tab"
            accessibilityLabel={VIEW_LABELS[view]}
            accessibilityState={{ selected }}
            onPress={() => onChange(view)}
            style={[styles.segment, selected && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>
              {VIEW_LABELS[view]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A team member's photo or initials circle. */
export function StaffAvatar({
  name,
  photoPath,
  size,
}: {
  name: string;
  photoPath: string | null;
  size: number;
}) {
  const uri = publicMediaUrl(photoPath);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={round} accessibilityIgnoresInvertColors />;
  return (
    <View style={[round, styles.initials, { backgroundColor: avatarTint(name) }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>{initialsFor(name)}</Text>
    </View>
  );
}

/** Diagonal grey stripes for time off (01), drawn with plain views. */
export function Hatch({ height }: { height: number }) {
  const stripes = Math.ceil((height + 200) / 14);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.hatch, { height: height + 400, top: -200 }]}>
        {Array.from({ length: stripes }, (_, i) => (
          <View key={i} style={[styles.stripe, { top: i * 14 }]} />
        ))}
      </View>
    </View>
  );
}

export const calendarStyles = StyleSheet.create({
  pressed: { opacity: 0.6 },
});

const styles = StyleSheet.create({
  header: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 1,
  },
  arrow: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  labelButton: { flex: 1, minHeight: minTouch, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.bold, fontSize: 19, color: colors.ink },
  pressed: { opacity: 0.6 },
  switch: {
    marginHorizontal: 20,
    marginTop: -6,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    flexDirection: "row",
    overflow: "hidden",
  },
  segment: { flex: 1, alignItems: "center", justifyContent: "center" },
  segmentOn: { backgroundColor: colors.ink },
  segmentText: { fontFamily: fonts.regular, fontSize: 15, color: colors.subtle },
  segmentTextOn: { fontFamily: fonts.medium, color: colors.white },
  initials: { alignItems: "center", justifyContent: "center" },
  initialsText: { fontFamily: fonts.bold, color: colors.white },
  hatch: {
    position: "absolute",
    left: -200,
    right: -200,
    transform: [{ rotate: "-45deg" }],
  },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 7,
    backgroundColor: "#ECEBF1",
  },
});
