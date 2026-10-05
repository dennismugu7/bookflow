import { formatKes } from "@bookflow/shared";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CloseButton } from "../../../../components/close-button";
import { LegalFooter } from "../../../../components/legal-footer";
import { MyBookingsLink } from "../../../../components/my-bookings-link";
import { SalonHeader } from "../../../../components/salon-header";
import { choiceQuery, readChoice } from "../../../../lib/booking-query";
import { firstName, formatShortDateTime } from "../../../../lib/format";
import { getPublicSalon, salonArea } from "../../../../lib/salon";
import { createClient } from "../../../../lib/supabase/server";
import { ConfirmSteps } from "./confirm-steps";

export const metadata: Metadata = {
  title: "Confirm your booking · Bookflow",
  robots: { index: false },
};

export default async function ConfirmPage(props: PageProps<"/s/[slug]/confirm">) {
  const { slug } = await props.params;
  const params = await props.searchParams;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();

  const choice = readChoice(params);
  const services = choice.serviceIds
    .map((id) => salon.services.find((s) => s.id === id))
    .filter((s) => s !== undefined);
  if (services.length === 0) redirect(`/s/${slug}`);
  const pickTime = `/s/${slug}/book?${choiceQuery({ serviceIds: choice.serviceIds, staffId: choice.staffId })}&step=time`;
  if (!choice.startsAt || !choice.expiresAt) redirect(pickTime);

  const professional = salon.staff.find((p) => p.id === (choice.heldStaffId ?? choice.staffId));
  const total = services.reduce((sum, s) => sum + s.price_kes, 0);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const [area, saved] = await Promise.all([
    salonArea(salon.address, salon.mapsUrl),
    user ? supabase.rpc("get_my_client_profile", { p_salon_slug: slug }) : null,
  ]);
  const profile = saved?.data as { full_name?: string; phone?: string } | null | undefined;

  return (
    <div className="min-h-full flex-1 bg-white">
      <main className="mx-auto w-full max-w-[560px] pb-16">
        <SalonHeader
          name={salon.name}
          tagline={salon.tagline}
          area={area}
          logoUrl={salon.logoUrl}
          backHref={pickTime}
          close={<CloseButton salonHref={`/s/${slug}`} />}
        />
        <ConfirmSteps
          slug={slug}
          salonName={salon.name}
          expiresAt={choice.expiresAt}
          pickTimeHref={pickTime}
          signInFailed={params.signin === "failed"}
          hold={{
            when: formatShortDateTime(choice.startsAt, salon.timezone),
            what: `${services.map((s) => s.name).join(", ")} - ${formatKes(total)}`,
          }}
          seenBy={
            professional && choice.heldStaffId
              ? `${firstName(professional.name)} will see this on the day.`
              : "The salon will see this."
          }
          user={user ? { email: user.email ?? "", name: meta.full_name ?? meta.name ?? "" } : null}
          profile={
            profile?.full_name && profile.phone
              ? { fullName: profile.full_name, phone: profile.phone }
              : null
          }
        />
        <MyBookingsLink className="mt-8" />
        <LegalFooter />
      </main>
    </div>
  );
}
