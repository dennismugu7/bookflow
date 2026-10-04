import { StyleSheet, View } from "react-native";

import { actionsFor, type AgendaBooking } from "../../lib/agenda";
import { BottomSheet } from "../BottomSheet";
import { BookingCard } from "./BookingCard";
import type { useBookingActions } from "./useBookingActions";

/**
 * The opened Today card (owner-v3 02) in a bottom sheet, for a booking tapped on the Calendar or a
 * client's profile. Cancel and No-show close this sheet and open their own.
 */
export function BookingSheet({
  booking,
  timeZone,
  now,
  nextId,
  viewer,
  actions,
  onClose,
  onOpenClient,
}: {
  booking: AgendaBooking | undefined;
  timeZone: string;
  now: Date;
  nextId: string | undefined;
  viewer: { isOwner: boolean; staffId: string | null };
  actions: ReturnType<typeof useBookingActions>;
  onClose: () => void;
  onOpenClient?: (clientId: string) => void;
}) {
  return (
    <BottomSheet visible={!!booking} onClose={onClose} variant="handle">
      {booking ? (
        <View style={styles.card}>
          <BookingCard
            booking={booking}
            timeZone={timeZone}
            nextId={nextId}
            open
            onToggle={onClose}
            actions={actionsFor(booking, now, viewer)}
            busy={actions.busyId === booking.id}
            error={actions.errorFor(booking.id)}
            onMarkDone={() => actions.markDone(booking)}
            onNoShow={() => {
              onClose();
              actions.noShow(booking);
            }}
            onCancel={() => {
              onClose();
              actions.cancel(booking);
            }}
            onOpenClient={
              onOpenClient &&
              ((id) => {
                onClose();
                onOpenClient(id);
              })
            }
          />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 4 },
});
