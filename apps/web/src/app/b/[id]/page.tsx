import { bookingLink, formatKes } from "@bookflow/shared";
import type { Metadata } from "next";
import Link from "next/link";

import { MyBookingsLink } from "../../../components/my-bookings-link";
import { RememberSalon } from "../../../components/back-button";
import { SalonHeader } from "../../../components/salon-header";
import { card } from "../../../components/ui";
import { firstName, formatClock, formatShortDateTime } from "../../../lib/format";
import { directionsUrl, getMyBooking } from "../../../lib/my-booking";
import { getPublicSalon, salonArea } from "../../../lib/salon";
import { ShareCard } from "./share-card";

export const metadata: Metadata = { title: "Your booking · Bookflow", robots: { index: false } };

/** Our own line drawing of a calendar with a big check, in the style of original 21. */
function BookedIllustration() {
  return (
    <svg viewBox="2 2 92 84" className="h-[85px] w-[93px]" aria-hidden="true" fill="none">
      <path d="M17 31l57-4 4 52-55 4z" fill="#F9C2AE" />
      <path
        d="M14 28l57-4 4 50-56 5z"
        fill="#fff"
        stroke="#111"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M14 38l58-4" stroke="#111" strokeWidth="2" />
      {[26, 36, 46, 56].map((x) => (
        <path
          key={x}
          d={`M${x} 31c-3-1-3-8 1-8s3 6 1 8`}
          stroke="#111"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="#F3A98E"
        />
      ))}
      {[47, 55, 63, 71].map((y) => (
        <path key={y} d={`M19 ${y}l52-3`} stroke="#111" strokeWidth="0.8" opacity="0.6" />
      ))}
      {[27, 37, 47, 57].map((x) => (
        <path key={x} d={`M${x} 42l1 34`} stroke="#111" strokeWidth="0.8" opacity="0.6" />
      ))}
      <path
        d="M31 58l10 12 32-44"
        stroke="#F3A98E"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 58l10 12 32-44"
        stroke="#111"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M80 16l4-6M84 24l7-2M76 10l1-7M8 40l-6-3M9 49l-6 1M10 57l-5 3"
        stroke="#111"
        strokeWidth="1.8"
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
  const [salon, area] = await Promise.all([
    getPublicSalon(booking.salon.slug),
    salonArea(booking.salon.address, booking.salon.maps_url),
  ]);
  const directions = directionsUrl(booking.salon.maps_url, booking.salon.address);
  const services = booking.services.map((s) => s.name).join(", ");

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col pb-10">
      <RememberSalon slug={booking.salon.slug} />
      <SalonHeader
        name={booking.salon.name}
        tagline={salon?.tagline ?? null}
        area={area}
        logoUrl={salon?.logoUrl ?? null}
      />

      <div className="flex flex-col items-center px-4 pt-[30px] text-center">
        <BookedIllustration />
        <h1 className="text-[24px] leading-[30px] font-bold">
          You&apos;re all set! <span aria-hidden="true">🎉</span>
        </h1>
        <p className="mt-[37px] text-[18px] leading-6 font-medium">See you soon!</p>
      </div>

      <section
        aria-label="Booking details"
        className={`${card} mx-5 mt-[45px] px-[17px] py-[13px]`}
      >
        <p className="text-[16px] leading-5 font-bold">
          {formatShortDateTime(booking.starts_at, tz)} – {formatClock(booking.ends_at, tz)}
        </p>
        <p className="mt-0.5 text-[16px] leading-[19px] font-medium">
          {services} – with {firstName(booking.staff_name)}
        </p>
        <p className="text-[14px] leading-[18px] font-medium text-muted">
          {formatKes(booking.total_kes)} · Pay at the salon
          {directions ? (
            <>
              {" · "}
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="press -my-3 inline-block py-3 font-semibold text-action"
              >
                Get directions
              </a>
            </>
          ) : null}
        </p>
      </section>

      <div className="flex gap-2.5 px-5 pt-4">
        <a
          href={`/b/${booking.id}/ics`}
          className="press flex h-[47px] flex-1 items-center justify-center rounded-[12px] border border-line-strong bg-white text-[15px] font-medium"
        >
          Add to calendar
        </a>
        <Link
          href="/me"
          className="press flex h-[47px] flex-1 items-center justify-center rounded-[12px] bg-ink text-[16px] font-semibold text-white"
        >
          View booking
        </Link>
      </div>
      <div className="px-5 pt-2.5">
        <Link
          href={`/s/${booking.salon.slug}`}
          className="press flex h-[47px] w-full items-center justify-center rounded-[12px] border border-line-strong bg-white text-[15px] font-medium"
        >
          Browse more services
        </Link>
      </div>

      <div className="mx-5 mt-[26px]">
        <ShareCard salonName={booking.salon.name} link={bookingLink(booking.salon.slug)} />
      </div>
      <MyBookingsLink className="mt-6" />
    </main>
  );
}
