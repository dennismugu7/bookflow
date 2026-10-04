"use client";

import { formatKes } from "@bookflow/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { directionsUrl } from "../../lib/directions";
import { firstName } from "../../lib/format";
import {
  bookAgainHref,
  bookingWhen,
  canCancelOnline,
  splitBookings,
  type MyBookingItem,
} from "../../lib/my-bookings";
import { cancelMyBooking } from "./actions";

type Tab = "upcoming" | "past";
type Sheet = { kind: "cancel" | "too-late"; booking: MyBookingItem } | null;

const STATUS: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-confirmed-tint text-confirmed-text" },
  completed: { label: "Completed", className: "bg-done-tint text-done-text" },
  cancelled: { label: "Cancelled", className: "bg-cancelled-tint text-danger" },
  no_show: { label: "No-show", className: "bg-attention-tint text-attention-text" },
};

const REASONS = ["Change of plans", "Found another time", "Other"] as const;

/** Text actions on a card: 44 px tall tap area without changing the line height of the design. */
const action = "press -my-2.5 inline-flex min-h-11 items-center text-[14px] font-medium";

/** Mockups 01 (Upcoming), 02 (Past), 03 (cancel sheet) and 04 (too late). */
export function MyBookings({ email, bookings }: { email: string; bookings: MyBookingItem[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState<string>();
  // Taken once per render from the server's data refresh; the cutoff is checked again on tap.
  const [now] = useState(() => new Date());
  const { upcoming, past } = splitBookings(bookings, now);
  const shown = tab === "upcoming" ? upcoming : past;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const tabClass = (active: boolean) =>
    `press relative -mb-px flex h-[46px] items-center border-b-[2.5px] text-[15px] ${
      active ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-muted"
    }`;

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-5 pt-[17px]">
        <h1 className="shrink-0 text-[26px] leading-9 font-bold">My bookings</h1>
        <p className="min-w-0 truncate text-[13px] font-medium text-muted">{email}</p>
      </header>

      <div
        role="tablist"
        aria-label="Bookings"
        className="mt-[5px] flex gap-6 border-b border-line px-5"
      >
        <button
          type="button"
          role="tab"
          id="tab-upcoming"
          aria-selected={tab === "upcoming"}
          aria-controls="bookings-panel"
          onClick={() => setTab("upcoming")}
          className={tabClass(tab === "upcoming")}
        >
          Upcoming{upcoming.length > 0 ? ` (${upcoming.length})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-past"
          aria-selected={tab === "past"}
          aria-controls="bookings-panel"
          onClick={() => setTab("past")}
          className={tabClass(tab === "past")}
        >
          Past
        </button>
      </div>

      <section
        id="bookings-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="flex flex-col gap-[15px] px-5 pt-4"
      >
        {shown.length === 0 ? (
          tab === "upcoming" ? (
            <div className="pt-10 text-center">
              <h2 className="text-[19px] leading-6 font-semibold">No upcoming bookings</h2>
              <p className="mt-1.5 text-[15px] leading-5 font-medium text-muted">
                Find your salon&apos;s link in your messages to book again.
              </p>
            </div>
          ) : (
            <div className="pt-10 text-center">
              <h2 className="text-[19px] leading-6 font-semibold">No past bookings</h2>
            </div>
          )
        ) : (
          shown.map((booking) => (
            <BookingCard key={booking.id} booking={booking} now={now}>
              {tab === "upcoming" ? (
                <UpcomingActions
                  booking={booking}
                  onCancel={() =>
                    setSheet({
                      kind: canCancelOnline(booking.starts_at, new Date()) ? "cancel" : "too-late",
                      booking,
                    })
                  }
                />
              ) : (
                <Link href={bookAgainHref(booking)} className={`${action} text-action`}>
                  Book again
                </Link>
              )}
            </BookingCard>
          ))
        )}
        {tab === "upcoming" ? (
          <p className="-mx-2 mt-[14px] text-center text-[16px] leading-[19px] font-medium text-muted">
            Booked from another phone? Sign in with the same email.
          </p>
        ) : null}
      </section>

      {sheet?.kind === "cancel" ? (
        <CancelSheet
          booking={sheet.booking}
          now={now}
          onClose={() => setSheet(null)}
          onTooLate={() => setSheet({ kind: "too-late", booking: sheet.booking })}
          onCancelled={() => {
            setSheet(null);
            setToast("Booking cancelled");
            router.refresh();
          }}
          onSignIn={() => router.refresh()}
        />
      ) : null}
      {sheet?.kind === "too-late" ? (
        <TooLateSheet booking={sheet.booking} onClose={() => setSheet(null)} />
      ) : null}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-5"
      >
        {toast ? (
          <p
            role="status"
            className="rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-white shadow-lg"
          >
            {toast}
          </p>
        ) : null}
      </div>
    </>
  );
}

function BookingCard({
  booking,
  now,
  children,
}: {
  booking: MyBookingItem;
  now: Date;
  children?: ReactNode;
}) {
  const status = STATUS[booking.status] ?? STATUS.confirmed!;
  return (
    <article className="flex gap-[13px] rounded-[16px] border border-line bg-white pt-[14px] pr-[17px] pb-[11px] pl-4">
      <span aria-hidden="true" className="mb-[3px] w-[3.5px] shrink-0 rounded-full bg-action" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 pt-px text-[16px] leading-6 font-semibold">
            {booking.services.map((s) => s.name).join(", ")}
          </h2>
          <span
            className={`flex h-[25px] shrink-0 items-center rounded-full px-[10px] text-[12px] font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <p className="text-[14px] leading-6 font-medium text-muted">
          {bookingWhen(booking.starts_at, booking.salon.timezone, now)} · with{" "}
          {firstName(booking.staff_name)}
        </p>
        <div className="mt-[3px] flex items-baseline justify-between gap-3 text-[14px] leading-6">
          <p className="min-w-0 truncate font-medium">{booking.salon.name}</p>
          <p className="shrink-0 font-bold">{formatKes(booking.total_kes)}</p>
        </div>
        {children ? <div className="mt-[5px] flex items-center gap-[17px]">{children}</div> : null}
      </div>
    </article>
  );
}

function UpcomingActions({ booking, onCancel }: { booking: MyBookingItem; onCancel: () => void }) {
  const directions = directionsUrl(booking.salon.maps_url, booking.salon.address);
  return (
    <>
      {directions ? (
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className={`${action} text-action`}
        >
          Get directions
        </a>
      ) : null}
      <a href={`/b/${booking.id}/ics`} className={`${action} text-action`}>
        Add to calendar
      </a>
      <button type="button" onClick={onCancel} className={`${action} ml-auto text-danger`}>
        Cancel
      </button>
    </>
  );
}

/** Bottom sheet frame shared by 03 and 04: dimmed page, white sheet with a handle. */
function BottomSheet({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  // Runs once per sheet: focus its first control, close on Esc, keep the page from scrolling.
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-[560px] overflow-y-auto rounded-t-[24px] bg-white px-5 pt-[10px] pb-[max(28px,env(safe-area-inset-bottom))] motion-safe:animate-[sheet-up_200ms_ease-out]"
      >
        <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-handle" />
        {children}
      </div>
    </div>
  );
}

const sheetTitle = "mt-[14px] text-[20px] leading-7 font-semibold";
const sheetText = "mt-1 text-[15px] leading-[18px] font-medium text-muted";
const dangerButton =
  "press flex h-[52px] w-full items-center justify-center rounded-full bg-danger text-[16px] font-semibold text-white disabled:opacity-60";
const blackButton =
  "press flex h-[52px] w-full items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-white";
const outlineButton =
  "press mt-[10px] flex h-[47px] w-full items-center justify-center rounded-full border-[1.5px] border-ink bg-white text-[15px] font-semibold";

function CancelSheet({
  booking,
  now,
  onClose,
  onTooLate,
  onCancelled,
  onSignIn,
}: {
  booking: MyBookingItem;
  now: Date;
  onClose: () => void;
  onTooLate: () => void;
  onCancelled: () => void;
  onSignIn: () => void;
}) {
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    if (!canCancelOnline(booking.starts_at, new Date())) {
      onTooLate();
      return;
    }
    const text = reason === "Other" ? other : (reason ?? "");
    startTransition(async () => {
      const result = await cancelMyBooking(booking.id, text);
      if (result.ok) onCancelled();
      else if (result.reason === "too_late") onTooLate();
      else if (result.reason === "signin") onSignIn();
      else setError(result.message);
    });
  }

  return (
    <BottomSheet labelledBy="cancel-title" onClose={onClose}>
      <h2 id="cancel-title" className={sheetTitle}>
        Cancel this booking?
      </h2>
      <p className={sheetText}>
        {booking.services.map((s) => s.name).join(", ")} ·{" "}
        {bookingWhen(booking.starts_at, booking.salon.timezone, now)} at {booking.salon.name}. The
        salon will see that you cancelled.
      </p>
      <fieldset className="mt-[15px]">
        <legend className="text-[14px] leading-5 font-semibold">Reason (optional)</legend>
        <div className="mt-[6px] flex flex-wrap gap-[9px]">
          {REASONS.map((r) => {
            const selected = reason === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={selected}
                onClick={() => setReason(selected ? null : r)}
                className={`press h-[37px] rounded-full px-[15px] text-[14px] font-medium ${
                  selected
                    ? "border-2 border-action bg-action-tint px-[14px] text-action"
                    : "border border-line-strong bg-white"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        {reason === "Other" ? (
          <div className="mt-3">
            <label htmlFor="cancel-other" className="sr-only">
              Your reason
            </label>
            <textarea
              id="cancel-other"
              value={other}
              maxLength={200}
              rows={2}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Tell the salon why (optional)"
              className="w-full resize-none rounded-[12px] border border-line-strong px-3.5 py-2.5 text-[16px] outline-none placeholder:text-muted focus:border-2 focus:border-select"
            />
            <p className="text-right text-[12px] text-muted">{other.length}/200</p>
          </div>
        ) : null}
      </fieldset>
      {error ? (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className={`${dangerButton} mt-[22px]`}
      >
        {pending ? "Cancelling…" : "Cancel booking"}
      </button>
      <button type="button" onClick={onClose} className={outlineButton}>
        Keep booking
      </button>
    </BottomSheet>
  );
}

function TooLateSheet({ booking, onClose }: { booking: MyBookingItem; onClose: () => void }) {
  return (
    <BottomSheet labelledBy="too-late-title" onClose={onClose}>
      <h2 id="too-late-title" className={sheetTitle}>
        It&apos;s too late to cancel online
      </h2>
      <p className={sheetText}>
        Bookings can be cancelled online up to 2 hours before. Please call the salon instead.
      </p>
      <div className="mt-[18px]">
        {booking.salon.phone ? (
          <a href={`tel:${booking.salon.phone}`} className={blackButton}>
            Call {booking.salon.name}
          </a>
        ) : null}
        <button type="button" onClick={onClose} className={outlineButton}>
          Close
        </button>
      </div>
    </BottomSheet>
  );
}
