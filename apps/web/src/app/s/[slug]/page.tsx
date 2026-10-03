import { mapsEmbedUrl } from "@bookflow/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { directionsUrl } from "../../../lib/my-booking";
import { getPublicSalon, mapQuery } from "../../../lib/salon";
import { isoWeekday, salonDate } from "../../../lib/time";
import { ServicePicker } from "./service-picker";

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

  return (
    <main className="mx-auto w-full max-w-[560px] pb-32">
      <div className="relative">
        {salon.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs; no image optimiser on the free plan
          <img src={salon.bannerUrl} alt="" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <div className="aspect-[16/7] w-full bg-brand-tint" />
        )}
      </div>

      <div className="flex flex-col gap-8 px-4">
        <header className="-mt-8 flex flex-col gap-3">
          {salon.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- as above
            <img
              src={salon.logoUrl}
              alt={`${salon.name} logo`}
              className="size-16 rounded-ds border-4 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-ds border-4 border-white bg-brand text-2xl font-extrabold text-white">
              {salon.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="text-[28px] leading-tight font-extrabold">{salon.name}</h1>
          {salon.tagline ? <p className="text-[15px] text-muted">{salon.tagline}</p> : null}
        </header>

        {salon.about ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{salon.about}</p>
        ) : null}

        <section aria-labelledby="services-heading" className="flex flex-col gap-3">
          <h2 id="services-heading" className="text-[22px] font-bold">
            Services
          </h2>
          {salon.services.length > 0 ? (
            <ServicePicker slug={salon.slug} services={salon.services} />
          ) : (
            <p className="text-[15px] text-muted">No services are bookable online right now.</p>
          )}
        </section>

        {salon.staff.length > 0 ? (
          <section aria-labelledby="team-heading" className="flex flex-col gap-3">
            <h2 id="team-heading" className="text-[22px] font-bold">
              Team
            </h2>
            <ul className="flex gap-4 overflow-x-auto pb-2">
              {salon.staff.map((person) => (
                <li
                  key={person.id}
                  className="flex w-24 shrink-0 flex-col items-center gap-2 text-center"
                >
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- as above
                    <img
                      src={person.photoUrl}
                      alt=""
                      className="size-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-xl font-bold text-brand">
                      {person.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[15px] font-semibold">{person.name}</p>
                    {person.title ? <p className="text-[13px] text-muted">{person.title}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="hours-heading" className="flex flex-col gap-3">
          <h2 id="hours-heading" className="text-[22px] font-bold">
            Opening hours
          </h2>
          <dl className="flex flex-col">
            {WEEKDAYS.map((name, index) => {
              const day = index + 1;
              const ranges = salon.hours.filter((h) => h.weekday === day);
              const isToday = day === today;
              return (
                <div
                  key={name}
                  className={`flex justify-between gap-4 border-b border-line py-2.5 text-[15px] ${isToday ? "font-bold" : ""}`}
                >
                  <dt>
                    {name}
                    {isToday ? (
                      <span className="ml-2 text-[13px] font-semibold text-brand">Today</span>
                    ) : null}
                  </dt>
                  <dd className={ranges.length === 0 ? "text-muted" : ""}>
                    {ranges.length === 0
                      ? "Closed"
                      : ranges
                          .map((r) => `${r.opens.slice(0, 5)} – ${r.closes.slice(0, 5)}`)
                          .join(", ")}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        {salon.address || directions ? (
          <section aria-labelledby="location-heading" className="flex flex-col gap-3">
            <h2 id="location-heading" className="text-[22px] font-bold">
              Location
            </h2>
            {salon.address ? <p className="text-[15px]">{salon.address}</p> : null}
            {query ? (
              <iframe
                title={`Map showing ${salon.name}`}
                src={mapsEmbedUrl(query)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-[4/3] w-full rounded-ds border border-line"
              />
            ) : null}
            {directions ? (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] items-center justify-center rounded-ds border border-line text-base font-bold"
              >
                Get directions
              </a>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
