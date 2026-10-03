import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readChoice } from "../../../../lib/booking-query";
import { getPublicSalon } from "../../../../lib/salon";
import { turnstileKeys } from "../../../../lib/server-env";
import { BookFlow, type Step } from "./book-flow";

export const metadata: Metadata = { title: "Book · Bookflow", robots: { index: false } };

const STEPS: Step[] = ["services", "pro", "time"];

export default async function BookPage(props: PageProps<"/s/[slug]/book">) {
  const { slug } = await props.params;
  const params = await props.searchParams;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();

  const choice = readChoice(params);
  const known = new Set(salon.services.map((s) => s.id));
  const serviceIds = choice.serviceIds.filter((id) => known.has(id));
  const requested =
    typeof params.step === "string" && (STEPS as string[]).includes(params.step)
      ? params.step
      : null;

  return (
    <BookFlow
      salon={{ slug: salon.slug, name: salon.name, timezone: salon.timezone }}
      services={salon.services}
      staff={salon.staff}
      initial={{
        serviceIds,
        staffId: choice.staffId,
        // Without services there is nothing to pick a professional or time for yet.
        step: serviceIds.length === 0 ? "services" : ((requested as Step | null) ?? "services"),
      }}
      turnstileSiteKey={turnstileKeys()?.siteKey ?? null}
    />
  );
}
