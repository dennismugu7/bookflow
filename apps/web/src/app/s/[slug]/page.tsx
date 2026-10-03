import { bookingLink, mapsEmbedUrl } from "@bookflow/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BottomBar, pillPrimary } from "../../../components/ui";
import { initials } from "../../../lib/format";
import { directionsUrl } from "../../../lib/my-booking";
import { getPublicSalon, mapQuery } from "../../../lib/salon";
import { isoWeekday, salonDate } from "../../../lib/time";
import {
  AboutText,
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

export default async function SalonPage(props: PageProps<"/s/[slug]">) {
  const { slug } = await props.params;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();

  const query = await mapQuery(salon);
  const directions = directionsUrl(salon.mapsUrl, salon.address);
  const today = isoWeekday(salonDate(new Date(), salon.timezone));
  const count = salon.services.length;

  return (
    <main className="mx-auto w-full max-w-[560px] pb-28">
      {/* Hero: banner at 4:3 with a share button */}
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

      {/* Info card overlapping the hero */}
      <div className="relative -mt-6 rounded-t-[24px] bg-white px-4 pt-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] leading-tight font-bold">{salon.name}</h1>
            {salon.tagline ? <p className="mt-1 text-[15px] text-muted">{salon.tagline}</p> : null}
            {salon.address ? (
              <p className="mt-2 truncate text-[13px] text-muted">{salon.address}</p>
            ) : null}
          </div>
          {salon.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- as above
            <img
              src={salon.logoUrl}
              alt={`${salon.name} logo`}
              className="size-16 shrink-0 rounded-ds object-cover"
            />
          ) : null}
        </div>
        <div className="mt-3">
          <OpenStatusLine hours={salon.hours} timeZone={salon.timezone} />
        </div>

        {salon.about ? (
          <section aria-labelledby="about-heading" className="mt-6">
            <h2 id="about-heading" className="mb-2 text-[18px] font-bold">
              About
            </h2>
            <AboutText text={salon.about} />
          </section>
        ) : null}

        <div className="mt-6">
          <SectionTabs hasTeam={salon.staff.length > 0} />
        </div>

        <section id="services" aria-labelledby="services-heading" className="scroll-mt-14 pt-6">
          <h2 id="services-heading" className="mb-3 text-[18px] font-bold">
            Services
          </h2>
          {count > 0 ? (
            <ServicesSection slug={salon.slug} services={salon.services} />
          ) : (
            <p className="text-[15px] text-muted">No services are bookable online right now.</p>
          )}
        </section>

        {salon.staff.length > 0 ? (
          <section id="team" aria-labelledby="team-heading" className="scroll-mt-14 pt-8">
            <h2 id="team-heading" className="mb-3 text-[18px] font-bold">
              Team
            </h2>
            <TeamSection
              team={salon.staff.map(({ id, name, title, bio, photoUrl }) => ({
                id,
                name,
                title,
                bio,
                photoUrl,
              }))}
            />
          </section>
        ) : null}

        <section id="hours" aria-labelledby="hours-heading" className="scroll-mt-14 pt-8">
          <h2 id="hours-heading" className="mb-2 text-[18px] font-bold">
            Opening hours
          </h2>
          <dl>
            {WEEKDAYS.map((name, index) => {
              const day = index + 1;
              const ranges = salon.hours.filter((h) => h.weekday === day);
              const open = ranges.length > 0;
              return (
                <div
                  key={name}
                  className={`flex h-8 items-center gap-3 text-[15px] ${day === today ? "font-bold" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${open ? "bg-success" : "bg-line-strong"}`}
                  />
                  <dt className="flex-1">{name}</dt>
                  <dd className={open ? "" : "text-muted"}>
                    {open
                      ? ranges
                          .map((r) => `${r.opens.slice(0, 5)} – ${r.closes.slice(0, 5)}`)
                          .join(", ")
                      : "Closed"}
                  </dd>
                </div>
              );
            })}
          </dl>

          {salon.address || query ? (
            <div className="mt-6" aria-label="Location">
              <h2 className="mb-3 text-[18px] font-bold">Location</h2>
              {query ? (
                <iframe
                  title={`Map showing ${salon.name}`}
                  src={mapsEmbedUrl(query)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-40 w-full rounded-ds border border-line"
                />
              ) : null}
              <p className="mt-3 text-[14px]">
                {salon.address ? <>{salon.address} </> : null}
                {directions ? (
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    Get directions
                  </a>
                ) : null}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <BottomBar label="Book">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Ready for a fresh look?</p>
          <p className="text-[13px] text-muted">
            Check out our {count} {count === 1 ? "service" : "services"}
          </p>
        </div>
        <Link href={`/s/${salon.slug}/book`} className={pillPrimary}>
          Book now
        </Link>
      </BottomBar>
    </main>
  );
}
