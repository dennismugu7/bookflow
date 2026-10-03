import { formatKes } from "@bookflow/shared";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { choiceQuery, readChoice } from "../../../../lib/booking-query";
import { getPublicSalon } from "../../../../lib/salon";
import { createClient } from "../../../../lib/supabase/server";
import { formatDuration, formatLongDate, formatTime } from "../../../../lib/time";
import { BackLink } from "../booking-ui";
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
  const pickTime = `/s/${slug}/book?${choiceQuery({ serviceIds: choice.serviceIds, staffId: choice.staffId })}`;
  if (!choice.startsAt || !choice.expiresAt) redirect(pickTime);

  const professional = salon.staff.find((p) => p.id === (choice.heldStaffId ?? choice.staffId));
  const total = services.reduce((sum, s) => sum + s.price_kes, 0);
  const minutes = services.reduce((sum, s) => sum + s.duration_min, 0);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pt-4 pb-16">
      <BackLink href={pickTime} label="Change the time" />
      <h1 className="mt-2 text-[22px] font-bold">Confirm your booking</h1>

      <section
        aria-label="Booking summary"
        className="mt-4 flex flex-col gap-3 rounded-ds bg-surface p-4"
      >
        <p className="text-[17px] font-bold">{salon.name}</p>
        <p className="text-[15px]">
          {formatLongDate(choice.startsAt, salon.timezone)} ·{" "}
          {formatTime(choice.startsAt, salon.timezone)}
        </p>
        {professional ? <p className="text-[13px] text-muted">With {professional.name}</p> : null}
        <ul className="flex flex-col gap-1 border-t border-line pt-3">
          {services.map((s) => (
            <li key={s.id} className="flex justify-between gap-4 text-[15px]">
              <span>
                {s.name}{" "}
                <span className="text-[13px] text-muted">· {formatDuration(s.duration_min)}</span>
              </span>
              <span>{formatKes(s.price_kes)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between gap-4 border-t border-line pt-3 text-[17px] font-bold">
          <span>Total · {formatDuration(minutes)}</span>
          <span>{formatKes(total)}</span>
        </div>
        <p className="text-[13px] text-muted">Pay at the salon. No payment is taken online.</p>
      </section>

      <ConfirmSteps
        slug={slug}
        expiresAt={choice.expiresAt}
        pickTimeHref={pickTime}
        signInFailed={params.signin === "failed"}
        user={user ? { email: user.email ?? "", name: meta.full_name ?? meta.name ?? "" } : null}
      />
    </main>
  );
}
