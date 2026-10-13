import { useState } from "react";

import type { AgendaBooking } from "../../lib/agenda";
import { statusErrorMessage } from "../../lib/new-booking";
import { rescheduleErrorMessage } from "../../lib/reschedule";
import { getSupabase } from "../../lib/supabase";
import { BOOKING_MOVED, showToast } from "../../lib/toast";
import { RescheduleSheet } from "./RescheduleSheet";
import { CancelSheet, NoShowSheet } from "./StatusSheets";

type Sheet = { kind: "cancel" | "noShow" | "reschedule"; booking: AgendaBooking };

/**
 * Mark done, No-show, Cancel and Reschedule for an opened booking card (owner-v3 02–04, QA 8663),
 * shared by Today, the Calendar and the client profile. `reload` runs after every save;
 * `onSheetDone` after the Cancel, No-show or Reschedule sheet saves.
 */
export function useBookingActions(
  timeZone: string,
  reload: () => Promise<void>,
  onSheetDone?: () => void,
) {
  const [busyId, setBusyId] = useState<string>();
  const [cardError, setCardError] = useState<{ id: string; message: string }>();
  const [sheet, setSheet] = useState<Sheet>();
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string>();

  /** Saves a status through update_booking_status; returns a friendly error, if any. */
  async function setStatus(
    booking: AgendaBooking,
    status: "completed" | "no_show" | "cancelled",
    reason?: string | null,
  ): Promise<string | undefined> {
    const { error: saveError } = await getSupabase().rpc("update_booking_status", {
      p_booking_id: booking.id,
      p_status: status,
      p_reason: reason ?? undefined,
    });
    await reload();
    return saveError ? statusErrorMessage(saveError) : undefined;
  }

  async function markDone(booking: AgendaBooking) {
    setBusyId(booking.id);
    setCardError(undefined);
    const message = await setStatus(booking, "completed");
    setBusyId(undefined);
    if (message) setCardError({ id: booking.id, message });
  }

  async function confirmSheet(reason?: string | null) {
    if (!sheet) return;
    setSheetSaving(true);
    setSheetError(undefined);
    const message = await setStatus(
      sheet.booking,
      sheet.kind === "cancel" ? "cancelled" : "no_show",
      reason,
    );
    setSheetSaving(false);
    if (message) {
      setSheetError(message);
      return;
    }
    setSheet(undefined);
    onSheetDone?.();
  }

  /** Moves the booking through reschedule_booking; the sheet stays open on an error. */
  async function confirmReschedule(start: Date) {
    if (!sheet) return;
    setSheetSaving(true);
    setSheetError(undefined);
    const { error: saveError } = await getSupabase().rpc("reschedule_booking", {
      p_booking_id: sheet.booking.id,
      p_starts_at: start.toISOString(),
    });
    setSheetSaving(false);
    if (saveError) {
      setSheetError(rescheduleErrorMessage(saveError));
      return;
    }
    setSheet(undefined);
    onSheetDone?.();
    await reload();
    showToast(BOOKING_MOVED);
  }

  const openSheet = (kind: Sheet["kind"], booking: AgendaBooking) => {
    setSheetError(undefined);
    setSheet({ kind, booking });
  };

  /** The Cancel, No-show and Reschedule sheets. */
  function sheets() {
    return (
      <>
        <CancelSheet
          booking={sheet?.kind === "cancel" ? sheet.booking : undefined}
          timeZone={timeZone}
          onClose={() => setSheet(undefined)}
          saving={sheetSaving}
          error={sheetError}
          onConfirm={(reason) => void confirmSheet(reason)}
        />
        <NoShowSheet
          booking={sheet?.kind === "noShow" ? sheet.booking : undefined}
          timeZone={timeZone}
          onClose={() => setSheet(undefined)}
          saving={sheetSaving}
          error={sheetError}
          onConfirm={() => void confirmSheet()}
        />
        <RescheduleSheet
          booking={sheet?.kind === "reschedule" ? sheet.booking : undefined}
          timeZone={timeZone}
          onClose={() => setSheet(undefined)}
          saving={sheetSaving}
          error={sheetError}
          onConfirm={(start) => void confirmReschedule(start)}
        />
      </>
    );
  }

  return {
    busyId,
    errorFor: (id: string) => (cardError?.id === id ? cardError.message : undefined),
    markDone: (booking: AgendaBooking) => void markDone(booking),
    noShow: (booking: AgendaBooking) => openSheet("noShow", booking),
    cancel: (booking: AgendaBooking) => openSheet("cancel", booking),
    reschedule: (booking: AgendaBooking) => openSheet("reschedule", booking),
    sheets,
  };
}
