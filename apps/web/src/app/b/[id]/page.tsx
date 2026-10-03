import { formatKes } from "@bookflow/shared";
import type { Metadata } from "next";
import Link from "next/link";

import { directionsUrl, getMyBooking } from "../../../lib/my-booking";
import { formatDuration, formatLongDate, formatTime } from "../../../lib/time";

export const metadata: Metadata = { title: "Your booking · Bookflow", robots: { index: false } };

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
  const directions = directionsUrl(booking.salon.maps_url, booking.salon.address);

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-full bg-success-tint"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-8 text-success"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-[28px] leading-tight font-extrabold">You&apos;re booked</h1>
        <p className="text-[15px] text-muted">{booking.salon.name} has your booking.</p>
      </div>

      <section
        aria-label="Booking details"
        className="flex flex-col gap-3 rounded-ds bg-surface p-4"
      >
        <p className="text-[17px] font-bold">{booking.salon.name}</p>
        <p className="text-[15px]">
          {formatLongDate(booking.starts_at, tz)} · {formatTime(booking.starts_at, tz)} –{" "}
          {formatTime(booking.ends_at, tz)}
        </p>
        <p className="text-[13px] text-muted">With {booking.staff_name}</p>
        {booking.salon.address ? (
          <p className="text-[13px] text-muted">{booking.salon.address}</p>
        ) : null}
        <ul className="flex flex-col gap-1 border-t border-line pt-3">
          {booking.services.map((s, i) => (
            <li key={i} className="flex justify-between gap-4 text-[15px]">
              <span>
                {s.name}{" "}
                <span className="text-[13px] text-muted">· {formatDuration(s.duration_min)}</span>
              </span>
              <span>{formatKes(s.price_kes)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between gap-4 border-t border-line pt-3 text-[17px] font-bold">
          <span>Total</span>
          <span>{formatKes(booking.total_kes)}</span>
        </div>
        <p className="text-[13px] text-muted">Pay at the salon.</p>
      </section>

      <div className="flex flex-col gap-3">
        {directions ? (
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center rounded-ds bg-brand text-base font-bold text-white"
          >
            Get directions
          </a>
        ) : null}
        <a
          href={`/b/${booking.id}/ics`}
          className="flex min-h-[52px] items-center justify-center rounded-ds border border-line text-base font-bold"
        >
          Add to calendar
        </a>
        <Link
          href={`/s/${booking.salon.slug}`}
          className="min-h-11 self-center py-3 text-[15px] font-semibold text-brand"
        >
          Back to {booking.salon.name}
        </Link>
      </div>
    </main>
  );
}
