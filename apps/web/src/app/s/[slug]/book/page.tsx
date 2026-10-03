import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readChoice } from "../../../../lib/booking-query";
import { getPublicSalon } from "../../../../lib/salon";
import { turnstileKeys } from "../../../../lib/server-env";
import { BookFlow } from "./book-flow";

export const metadata: Metadata = { title: "Book · Bookflow", robots: { index: false } };

export default async function BookPage(props: PageProps<"/s/[slug]/book">) {
  const { slug } = await props.params;
  const params = await props.searchParams;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();

  const choice = readChoice(params);
  const known = new Set(salon.services.map((s) => s.id));
  const serviceIds = choice.serviceIds.filter((id) => known.has(id));

  return (
    <BookFlow
      salon={{ slug: salon.slug, name: salon.name, timezone: salon.timezone }}
      services={salon.services}
      staff={salon.staff}
      // The step comes from ?step= on the client; without services it is always "services".
      initial={{ serviceIds, staffId: choice.staffId }}
      turnstileSiteKey={turnstileKeys()?.siteKey ?? null}
    />
  );
}
