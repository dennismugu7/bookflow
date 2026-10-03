import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { readChoice } from "../../../../lib/booking-query";
import { getPublicSalon } from "../../../../lib/salon";
import { turnstileKeys } from "../../../../lib/server-env";
import { BookFlow } from "./book-flow";

export const metadata: Metadata = { title: "Choose a time · Bookflow", robots: { index: false } };

export default async function BookPage(props: PageProps<"/s/[slug]/book">) {
  const { slug } = await props.params;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();

  const choice = readChoice(await props.searchParams);
  const services = choice.serviceIds
    .map((id) => salon.services.find((s) => s.id === id))
    .filter((s) => s !== undefined);
  if (services.length === 0 || services.length !== choice.serviceIds.length) redirect(`/s/${slug}`);

  // Only people who offer every chosen service can take this appointment.
  const staff = salon.staff.filter((p) =>
    choice.serviceIds.every((id) => p.serviceIds.includes(id)),
  );

  return (
    <BookFlow
      salon={{ slug: salon.slug, name: salon.name, timezone: salon.timezone }}
      services={services}
      staff={staff.map(({ id, name, title, photoUrl }) => ({ id, name, title, photoUrl }))}
      initialStaffId={
        choice.staffId && staff.some((p) => p.id === choice.staffId) ? choice.staffId : null
      }
      turnstileSiteKey={turnstileKeys()?.siteKey ?? null}
    />
  );
}
