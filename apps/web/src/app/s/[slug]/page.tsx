import { bookingLink, mapsEmbedUrl } from "@bookflow/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MyBookingsLink } from "../../../components/my-bookings-link";
import { SalonIdentity } from "../../../components/salon-header";
import { initials } from "../../../lib/format";
import { directionsUrl } from "../../../lib/my-booking";
import { getPublicSalon, mapQuery, salonArea } from "../../../lib/salon";
import { isoWeekday, salonDate } from "../../../lib/time";
import {
  AboutText,
  BookNowBar,
  OpenStatusLine,
  SectionTabs,
  ServicesSection,
  ShareButton,
  TeamSection,
} from "./salon-client";

export const revalidate = 60;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export async function generateMetadata(props: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const salon = await getPublicSalon(slug);
  if (!salon) return { title: "Salon not found · Bookflow" };
  const description = salon.tagline ?? `Book an appointment at ${salon.name}.`;
  return {
    title: `${salon.name} · Book online`,
    description,
    openGraph: {
      title: salon.name,
      description,
      url: `/s/${salon.slug}`,
      images: salon.bannerUrl ? [{ url: salon.bannerUrl, alt: salon.name }] : undefined,
    },
  };
}

/** Section heading from originals 02–04 (26 px, medium). */
const sectionHeading = "text-[26px] leading-8 font-semibold";

export default async function SalonPage(props: PageProps<"/s/[slug]">) {
  const { slug } = await props.params;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();

  const [query, area] = await Promise.all([
    mapQuery(salon),
    salonArea(salon.address, salon.mapsUrl),
  ]);
  const directions = directionsUrl(salon.mapsUrl, salon.address);
  const today = isoWeekday(salonDate(new Date(), salon.timezone));
  const count = salon.services.length;

  return (
    <main className="mx-auto w-full max-w-[560px] pb-[110px]">
      {/* Hero: banner at 4:3 with a share button (original 01) */}
      <div className="relative">
        {salon.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs; no image optimiser on the free plan
          <img src={salon.bannerUrl} alt="" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[4/3] w-full items-center justify-center bg-lavender text-6xl font-bold text-brand"
          >
            {initials(salon.name)}
          </div>
        )}
        <ShareButton title={salon.name} url={bookingLink(salon.slug)} />
      </div>

      {/*
        Everything below the hero lives in this one container, so the sticky tabs (a direct child)
        stay stuck for the whole length of the sections. No ancestor may set overflow.
      */}
      <div className="relative -mt-7 rounded-t-[20px] bg-white">
        <div className="px-[30px] pt-[31px] pb-10">
          <SalonIdentity
            as="h1"
            name={salon.name}
            tagline={salon.tagline}
            area={area}
            logoUrl={salon.logoUrl}
          />
          <div className="mt-4">
            <OpenStatusLine hours={salon.hours} timeZone={salon.timezone} />
          </div>

          {salon.about ? (
            <section aria-labelledby="about-heading" className="mt-[21px]">
              <h2 id="about-heading" className="text-[20px] leading-6 font-bold">
                About
              </h2>
              <AboutText text={salon.about} />
            </section>
          ) : null}
        </div>

        <SectionTabs hasTeam={salon.staff.length > 0} />

        <section id="services" aria-labelledby="services-heading" className="scroll-mt-[55px]">
          <h2 id="services-heading" className={`${sectionHeading} px-10 pt-[33px] pb-4`}>
            Services
          </h2>
          <div className="bg-surface px-[22px] pt-2 pb-[15px]">
            {count > 0 ? (
              <ServicesSection slug={salon.slug} services={salon.services} />
            ) : (
              <p className="py-4 text-[15px] text-muted">
                No services are bookable online right now.
              </p>
            )}
          </div>
        </section>

        {salon.staff.length > 0 ? (
          <section
            id="team"
            aria-labelledby="team-heading"
            className="scroll-mt-[76px] pt-1.5 pb-1.5"
          >
            <TeamSection
              headingClass={`${sectionHeading} pl-10`}
              team={salon.staff.map(({ id, name, title, bio, photoUrl }) => ({
                id,
                name,
                title,
                bio,
                photoUrl,
              }))}
            />
            <hr className="mx-11 mt-[30px] border-line" />
          </section>
        ) : null}

        <section
          id="hours"
          aria-labelledby="hours-heading"
          className="scroll-mt-[55px] px-[47px] pt-[18px]"
        >
          <h2 id="hours-heading" className="text-[21px] leading-7 font-semibold">
            Opening times
          </h2>
          <dl className="mt-[13px]">
            {WEEKDAYS.map((name, index) => {
              const day = index + 1;
              const ranges = salon.hours.filter((h) => h.weekday === day);
              const open = ranges.length > 0;
              return (
                <div
                  key={name}
                  className={`flex h-[28px] items-center text-[16px] ${day === today ? "font-bold" : "font-medium"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-[11px] shrink-0 rounded-full ${open ? "bg-day-dot" : "bg-line-strong"}`}
                  />
                  <dt className="ml-[11px] flex-1">{name}</dt>
                  <dd className={open ? "" : "text-muted"}>
                    {open
                      ? ranges
                          .map((r) => `${r.opens.slice(0, 5)} - ${r.closes.slice(0, 5)}`)
                          .join(", ")
                      : "Closed"}
                  </dd>
                </div>
              );
            })}
          </dl>

          {salon.address || query ? (
            <div aria-label="Location" role="group">
              <hr className="mt-10 border-line" />
              {query ? (
                <iframe
                  title={`Map showing ${salon.name}`}
                  src={mapsEmbedUrl(query)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="mx-1.5 mt-7 h-[158px] w-[calc(100%-12px)] rounded-[16px]"
                />
              ) : null}
              <p className="mx-1.5 mt-3 text-[15px] font-medium">
                {salon.address ? <>{salon.address.replace(/\.$/, "")}. </> : null}
                {directions ? (
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press -my-3 inline-block py-3 font-medium text-link"
                  >
                    Get directions
                  </a>
                ) : null}
              </p>
            </div>
          ) : null}
        </section>
        <MyBookingsLink className="mt-8" />
      </div>

      <BookNowBar slug={salon.slug} count={count} />
    </main>
  );
}
