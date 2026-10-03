import { bookingLink, formatKes } from "@bookflow/shared";
import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SalonHeader } from "../../../components/salon-header";
import { formatClock, formatShortDateTime } from "../../../lib/format";
import { directionsUrl, getMyBooking } from "../../../lib/my-booking";
import { getPublicSalon } from "../../../lib/salon";
import { ShareCard } from "./share-card";

export const metadata: Metadata = { title: "Your booking · Bookflow", robots: { index: false } };

/** Our own calendar-with-a-check illustration (about 96 px), in brand colours. */
function BookedIllustration() {
  return (
    <svg viewBox="0 0 96 96" className="size-24" aria-hidden="true">
      <rect x="14" y="20" width="62" height="60" rx="10" fill="#ECE8FB" />
      <rect x="14" y="20" width="62" height="16" rx="8" fill="#3A1FA8" />
      <rect x="14" y="30" width="62" height="6" fill="#3A1FA8" />
      {[26, 38, 50, 62].map((x) => (
        <rect key={x} x={x} y="14" width="4" height="12" rx="2" fill="#16131F" />
      ))}
      {[46, 56, 66].map((y) =>
        [24, 36, 48, 60].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="6" height="5" rx="1.5" fill="#C9C5D6" />
        )),
      )}
      <circle cx="70" cy="70" r="18" fill="#5B45E0" />
      <path
        d="M61 70l6 6 12-13"
        fill="none"
        stroke="#fff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M82 18l4-6M86 26l7-2M78 12l1-7"
        stroke="#F0A030"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function BookingPage(props: PageProps<"/b/[id]">) {
  const { id } = await props.params;
  const booking = await getMyBooking(id);

  if (!booking) {
    return (
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-[22px] font-bold">Sign in to see this booking</h1>
        <p className="text-[15px] text-muted">
          Open the link on the phone you booked with, signed in with the same Google account or
          email.
        </p>
      </main>
    );
  }

  const tz = booking.salon.timezone;
  const salon = await getPublicSalon(booking.salon.slug);
  const directions = directionsUrl(booking.salon.maps_url, booking.salon.address);
  const services = booking.services.map((s) => s.name).join(", ");

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col pb-10">
      <SalonHeader
        name={booking.salon.name}
        address={booking.salon.address}
        logoUrl={salon?.logoUrl ?? null}
      />

      <div className="flex flex-col items-center gap-2 px-4 pt-6 pb-8 text-center">
        <BookedIllustration />
        <h1 className="mt-2 text-[24px] font-bold">
          You&apos;re all set! <span aria-hidden="true">🎉</span>
        </h1>
        <p className="text-[16px] text-muted">See you soon!</p>
      </div>

      <section aria-label="Booking details" className="bg-surface px-4 py-5">
        <p className="text-[16px] font-bold">
          {formatShortDateTime(booking.starts_at, tz)} – {formatClock(booking.ends_at, tz)}
        </p>
        <p className="mt-1 text-[15px]">
          {services} – with {booking.staff_name}
        </p>
        <p className="mt-1 text-[14px] text-muted">
          {formatKes(booking.total_kes)} · Pay at the salon
        </p>
      </section>

      <div className="flex gap-3 px-4 pt-5">
        <a
          href={`/b/${booking.id}/ics`}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white text-[15px] font-semibold"
        >
          <CalendarPlus className="size-5" aria-hidden="true" /> Add to calendar
        </a>
        {directions ? (
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-white"
          >
            Get directions
          </a>
        ) : null}
      </div>

      <div className="px-4 pt-6">
        <ShareCard salonName={booking.salon.name} link={bookingLink(booking.salon.slug)} />
      </div>

      <Link
        href={`/s/${booking.salon.slug}`}
        className="mt-4 min-h-11 self-center py-3 text-[15px] font-semibold text-brand"
      >
        Back to {booking.salon.name}
      </Link>
    </main>
  );
}
