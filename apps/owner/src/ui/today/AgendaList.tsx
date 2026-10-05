import { bookingLink } from "@bookflow/shared";
import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import { actionsFor, nextBookingId, timeline, type Agenda } from "../../lib/agenda";
import { useSession } from "../../lib/session";
import { colors, fonts } from "../../theme";
import { ShareLinkSheet } from "../ShareLinkSheet";
import { BookingCard } from "./BookingCard";
import { GapRow } from "./GapRow";
import { StatTiles } from "./StatTiles";
import type { useBookingActions } from "./useBookingActions";

type Props = {
  agenda: Agenda;
  timeZone: string;
  now: Date;
  viewer: { isOwner: boolean; staffId: string | null };
  slug: string;
  actions: ReturnType<typeof useBookingActions>;
  openId: string | undefined;
  onToggle: (id: string) => void;
  /** Owners fill a free gap with a new booking. */
  onFill?: (start: Date) => void;
  onOpenClient: (clientId: string) => void;
  /** "Next up" on Today; another day's list reads "Bookings". */
  label: string;
};

/** A day with bookings: tiles, the label, bookings and gaps in time order, then the share pill (owner-v3 01). */
export function AgendaList(props: Props) {
  const { agenda, timeZone, now, viewer, actions, openId, onToggle, onFill } = props;
  const nextId = nextBookingId(agenda.bookings, now);
  return (
    <>
      <View style={styles.tiles}>
        <StatTiles stats={agenda.stats} />
      </View>
      <Text style={styles.nextUp}>{props.label}</Text>
      <View style={styles.list}>
        {timeline(agenda).map((row) =>
          row.kind === "gap" ? (
            <GapRow
              key={`gap-${row.gap.starts_at}`}
              gap={row.gap}
              timeZone={timeZone}
              onFill={onFill && (() => onFill(new Date(row.gap.starts_at)))}
            />
          ) : (
            <BookingCard
              key={row.booking.id}
              booking={row.booking}
              timeZone={timeZone}
              nextId={nextId}
              open={openId === row.booking.id}
              onToggle={() => onToggle(row.booking.id)}
              actions={actionsFor(row.booking, now, viewer)}
              busy={actions.busyId === row.booking.id}
              error={actions.errorFor(row.booking.id)}
              onMarkDone={() => actions.markDone(row.booking)}
              onNoShow={() => actions.noShow(row.booking)}
              onCancel={() => actions.cancel(row.booking)}
              onOpenClient={props.onOpenClient}
            />
          ),
        )}
      </View>
      <View style={styles.sharePill}>
        <SharePill slug={props.slug} />
      </View>
    </>
  );
}

/** Free gaps alone, under the empty state, when the day has no bookings yet. */
export function EmptyDayGaps({
  agenda,
  timeZone,
  onFill,
}: {
  agenda: Agenda;
  timeZone: string;
  onFill?: (start: Date) => void;
}) {
  if (agenda.gaps.length === 0) return null;
  return (
    <View style={[styles.list, styles.emptyGaps]}>
      {agenda.gaps.map((gap) => (
        <GapRow
          key={gap.starts_at}
          gap={gap}
          timeZone={timeZone}
          onFill={onFill && (() => onFill(new Date(gap.starts_at)))}
        />
      ))}
    </View>
  );
}

/**
 * "Share your booking link ›": the blue pill (owner-v2 09, owner-v3 01), or blue text on the empty
 * client list (owner-v4 03).
 */
export function SharePill({ slug, variant = "pill" }: { slug: string; variant?: "pill" | "link" }) {
  const { membership } = useSession();
  const [open, setOpen] = useState(false);
  const link = variant === "link";
  // Opens the same sheet as Menu → Booking link (owner-v6 02), with the owner's message.
  const share = () =>
    membership ? setOpen(true) : void Share.share({ message: bookingLink(slug) });
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share your booking link"
        onPress={share}
        style={({ pressed }) => [link ? styles.link : styles.share, pressed && styles.pressed]}
      >
        <Text style={link ? styles.linkText : styles.shareText}>Share your booking link ›</Text>
      </Pressable>
      {membership ? (
        <ShareLinkSheet
          visible={open}
          onClose={() => setOpen(false)}
          salon={membership.salon}
          canSave={membership.role === "owner"}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  tiles: { marginTop: 17 },
  nextUp: {
    marginTop: 21,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtle,
  },
  list: { marginTop: 11, gap: 9 },
  emptyGaps: { marginTop: 32 },
  sharePill: { alignItems: "center", marginTop: 24, marginBottom: 96 },
  share: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  link: { minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  linkText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.action },
  pressed: { opacity: 0.85 },
});
