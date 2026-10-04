"use client";

import { formatKes } from "@bookflow/shared";
import { ArrowLeft, ArrowRight, ShoppingCart, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CloseButton } from "../../../../components/close-button";
import { MyBookingsLink } from "../../../../components/my-bookings-link";
import { ProfileSheet, type Profile } from "../../../../components/profile-sheet";
import {
  AddCircle,
  BottomBar,
  FlowTopBar,
  Initials,
  SelectedCheck,
  ServiceText,
  cardClass,
  flowTitle,
  pillOutline,
  pillPrimary,
} from "../../../../components/ui";
import { choiceQuery } from "../../../../lib/booking-query";
import { cartSummary, initials } from "../../../../lib/format";
import type { SalonService, SalonStaff } from "../../../../lib/salon";
import { createClient } from "../../../../lib/supabase/client";
import { dayStrip, formatDuration, formatTime } from "../../../../lib/time";
import { Turnstile, type TurnstileHandle } from "./turnstile";

export type Step = "services" | "pro" | "time";
type Slot = { starts_at: string; staff_id: string };

type Props = {
  salon: { slug: string; name: string; timezone: string };
  services: SalonService[];
  staff: SalonStaff[];
  initial: { serviceIds: string[]; staffId: string | null };
  turnstileSiteKey: string | null;
};

const TITLES: Record<Step, string> = {
  services: "Select services",
  pro: "Select professional",
  time: "Pick a time",
};

function isStep(value: string | null | undefined): value is Step {
  return value === "services" || value === "pro" || value === "time";
}

/** How many steps this tab has moved forward inside the flow, kept in the history entry. */
function historyDepth(): number {
  const state = window.history.state as { bfDepth?: number } | null;
  return state?.bfDepth ?? 0;
}

export function BookFlow({ salon, services, staff, initial, turnstileSiteKey }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [serviceIds, setServiceIds] = useState(initial.serviceIds);
  const [chosenStaffId, setChosenStaffId] = useState<string | null>(initial.staffId);
  const [profile, setProfile] = useState<Profile | null>(null);
  const closeProfile = useCallback(() => setProfile(null), []);

  // The step lives in the URL and changes in the browser only (history.pushState, which Next keeps
  // in sync with useSearchParams), so moving between steps never waits for the server.
  const urlStep = searchParams.get("step");
  const step: Step = serviceIds.length > 0 && isStep(urlStep) ? urlStep : "services";

  const chosen = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.id === id)).filter((s) => s !== undefined),
    [serviceIds, services],
  );
  const total = chosen.reduce((sum, s) => sum + s.price_kes, 0);
  const minutes = chosen.reduce((sum, s) => sum + s.duration_min, 0);

  // Only people who offer every chosen service can take this appointment.
  const qualified = useMemo(
    () =>
      staff.filter(
        (p) => serviceIds.length > 0 && serviceIds.every((id) => p.serviceIds.includes(id)),
      ),
    [staff, serviceIds],
  );
  const showPro = qualified.length > 1;
  const staffId =
    qualified.length === 1
      ? qualified[0]!.id
      : qualified.some((p) => p.id === chosenStaffId)
        ? chosenStaffId
        : null;

  const urlFor = useCallback(
    (next: Step) => `/s/${salon.slug}/book?${choiceQuery({ serviceIds, staffId })}&step=${next}`,
    [salon.slug, serviceIds, staffId],
  );

  // Keep the choices in the URL so a refresh or the Google round-trip doesn't lose them.
  useEffect(() => {
    window.history.replaceState({ bfDepth: historyDepth() }, "", urlFor(step));
  }, [urlFor, step]);

  // Coming back here (e.g. to change the time) frees any hold this visitor still has.
  useEffect(() => {
    void fetch("/api/holds/release", { method: "POST" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const forward = (next: Step) =>
    window.history.pushState({ bfDepth: historyDepth() + 1 }, "", urlFor(next));

  // The back arrow does what the phone's back button does. A tab that arrived mid-flow (say from
  // the confirm page's back arrow) has no earlier step in its history, so it steps back in place.
  const back = () => {
    if (historyDepth() > 0) window.history.back();
    else
      window.history.replaceState(
        { bfDepth: 0 },
        "",
        urlFor(step === "time" && showPro ? "pro" : "services"),
      );
  };

  return (
    <div className="min-h-full flex-1 bg-white">
      <main className="mx-auto w-full max-w-[560px] px-[22px] pb-32">
        <FlowTopBar
          back={
            step === "services" ? (
              <Link
                href={`/s/${salon.slug}`}
                aria-label={`Back to ${salon.name}`}
                className="press flex size-11 items-center justify-center"
              >
                <ArrowLeft className="size-7" strokeWidth={2.5} />
              </Link>
            ) : (
              <button
                type="button"
                aria-label="Back"
                onClick={back}
                className="press flex size-11 items-center justify-center"
              >
                <ArrowLeft className="size-7" strokeWidth={2.5} />
              </button>
            )
          }
          close={<CloseButton salonHref={`/s/${salon.slug}`} />}
        />
        <h1 className={flowTitle}>{TITLES[step]}</h1>
        <div className={step === "pro" ? "mt-[33px]" : "mt-6"}>
          {step === "services" ? (
            <ServicesStep
              services={services}
              selected={serviceIds}
              toggle={(id) =>
                setServiceIds((ids) =>
                  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
                )
              }
            />
          ) : step === "pro" ? (
            <ProStep
              people={qualified}
              staffId={staffId}
              choose={setChosenStaffId}
              viewProfile={setProfile}
            />
          ) : (
            <TimeStep
              salon={salon}
              supabase={supabase}
              serviceIds={serviceIds}
              staffId={staffId}
              turnstileSiteKey={turnstileSiteKey}
              summary={{ total, count: chosen.length, minutes }}
              onHeld={(startsAt, held) =>
                router.push(
                  `/s/${salon.slug}/confirm?${choiceQuery({
                    serviceIds,
                    staffId,
                    startsAt,
                    expiresAt: held.expiresAt,
                    heldStaffId: held.staffId,
                  })}`,
                )
              }
            />
          )}
        </div>
        <MyBookingsLink className="mt-6" />
      </main>

      {step !== "time" ? (
        <BottomBar label="Your booking">
          <Total total={total} count={chosen.length} minutes={minutes} />
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => forward(step === "services" && showPro ? "pro" : "time")}
            className={pillPrimary}
          >
            Continue <ArrowRight className="size-6" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </BottomBar>
      ) : null}

      <ProfileSheet profile={profile} onClose={closeProfile} />
    </div>
  );
}

/** "from KES 400" over "🛒 1 item • 10 mins" (originals 09, 12). */
function Total({ total, count, minutes }: { total: number; count: number; minutes: number }) {
  return (
    <div className="min-w-0 flex-1" aria-live="polite">
      <p className="text-[20px] leading-[26px] font-bold">
        from <span className="text-price">{formatKes(total)}</span>
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[15px] leading-5 font-medium text-muted">
        <ShoppingCart className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        {cartSummary(count, minutes).replace(" · ", "  •  ")}
      </p>
    </div>
  );
}

function ServicesStep({
  services,
  selected,
  toggle,
}: {
  services: SalonService[];
  selected: string[];
  toggle: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-[13px]">
      {services.map((service) => {
        const on = selected.includes(service.id);
        return (
          <li key={service.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => toggle(service.id)}
              className={`${cardClass(on)} press flex w-full items-center gap-3 pt-[14px] pr-[17px] pb-3 pl-5 text-left`}
            >
              <ServiceText
                name={service.name}
                duration={formatDuration(service.duration_min)}
                price={formatKes(service.price_kes)}
              />
              {on ? (
                <span className="self-end">
                  <SelectedCheck />
                </span>
              ) : (
                <AddCircle />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ProStep({
  people,
  staffId,
  choose,
  viewProfile,
}: {
  people: SalonStaff[];
  staffId: string | null;
  choose: (id: string | null) => void;
  viewProfile: (p: Profile) => void;
}) {
  const row = "flex items-center gap-[14px] p-[17px]";
  return (
    <ul className="flex flex-col gap-[13px]">
      <li className={`${cardClass(staffId === null)} ${row}`}>
        <span
          aria-hidden="true"
          className="flex size-[85px] shrink-0 items-center justify-center rounded-full bg-lavender text-select"
        >
          <Shuffle className="size-8" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] leading-6 font-medium">Any professional</span>
          <span className="mt-1 block truncate text-[15px] leading-5 font-medium text-muted">
            Maximum availability
          </span>
        </span>
        <SelectButton
          selected={staffId === null}
          label="Any professional"
          onSelect={() => choose(null)}
        />
      </li>
      {people.map((person) => {
        const on = staffId === person.id;
        return (
          <li key={person.id} className={`${cardClass(on)} ${row}`}>
            {person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs
              <img
                src={person.photoUrl}
                alt=""
                className="size-[85px] shrink-0 rounded-full object-cover"
              />
            ) : (
              <Initials text={initials(person.name)} className="size-[85px] text-2xl" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[19px] leading-6 font-medium">
                {person.name}
              </span>
              {person.title ? (
                <span className="mt-1 block truncate text-[15px] leading-5 font-medium text-muted">
                  {person.title}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => viewProfile(person)}
                className="press -mb-2.5 min-h-11 text-[16px] font-medium"
                aria-label={`View ${person.name}'s profile`}
              >
                View profile
              </button>
            </span>
            <SelectButton selected={on} label={person.name} onSelect={() => choose(person.id)} />
          </li>
        );
      })}
    </ul>
  );
}

function SelectButton({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return selected ? (
    <span role="img" aria-label={`${label} selected`}>
      <SelectedCheck />
    </span>
  ) : (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Select ${label}`}
      className={`${pillOutline} h-[43px] border-line shadow-[0_2px_4px_rgba(0,0,0,0.12)]`}
    >
      Select
    </button>
  );
}

function TimeStep({
  salon,
  supabase,
  serviceIds,
  staffId,
  turnstileSiteKey,
  summary,
  onHeld,
}: {
  salon: Props["salon"];
  supabase: ReturnType<typeof createClient>;
  serviceIds: string[];
  staffId: string | null;
  turnstileSiteKey: string | null;
  summary: { total: number; count: number; minutes: number };
  onHeld: (startsAt: string, held: { expiresAt: string; staffId?: string }) => void;
}) {
  const days = useMemo(() => dayStrip(new Date(), salon.timezone), [salon.timezone]);
  const key = `${serviceIds.join(",")}|${staffId ?? "any"}`;
  // Results are tagged with what they were loaded for, so a change shows skeletons.
  const [availability, setAvailability] = useState<{
    key: string;
    byDay: Record<string, Slot[] | "error">;
  }>();
  const [picked, setPicked] = useState<{ key: string; date: string }>();
  const [time, setTime] = useState<string>();
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string>();
  const turnstile = useRef<TurnstileHandle>(null);

  useEffect(() => {
    let current = true;
    void Promise.all(
      days.map(async (day) => {
        const { data, error: loadError } = await supabase.rpc("get_availability", {
          p_salon_slug: salon.slug,
          p_service_ids: serviceIds,
          p_date: day.date,
          ...(staffId ? { p_staff_id: staffId } : {}),
        });
        return [day.date, loadError ? "error" : (data ?? [])] as const;
      }),
    ).then((entries) => {
      if (current) setAvailability({ key, byDay: Object.fromEntries(entries) });
    });
    return () => {
      current = false;
    };
  }, [supabase, salon.slug, serviceIds, staffId, days, key]);

  const loading = availability?.key !== key;
  const byDay = loading ? {} : (availability?.byDay ?? {});
  const date =
    picked?.key === key
      ? picked.date
      : loading
        ? undefined
        : (days.find((d) => {
            const slots = byDay[d.date];
            return slots && slots !== "error" && slots.length > 0;
          })?.date ?? days[0]!.date);
  const daySlots = date ? byDay[date] : undefined;
  // With "any professional", several people can share a start time; show each time once.
  const times =
    daySlots && daySlots !== "error" ? [...new Set(daySlots.map((s) => s.starts_at))] : [];
  const selectedTime = time && times.includes(time) ? time : undefined;

  async function hold() {
    if (!selectedTime) return;
    setError(undefined);
    setHolding(true);
    try {
      const token = await turnstile.current?.getToken();
      if (!token) {
        setError("We couldn't confirm you're not a robot. Try again.");
        return;
      }
      const response = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: salon.slug,
          serviceIds,
          startsAt: selectedTime,
          staffId,
          turnstileToken: token,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        expiresAt?: string;
        staffId?: string;
      };
      if (!response.ok || !result.expiresAt) {
        setError(result.message ?? "Something went wrong. Try again.");
        if (response.status === 409 && date) {
          // Drop the taken time so it can't be picked again.
          setAvailability((a) => {
            const day = a?.byDay[date];
            return a && day && day !== "error"
              ? {
                  ...a,
                  byDay: { ...a.byDay, [date]: day.filter((x) => x.starts_at !== selectedTime) },
                }
              : a;
          });
          setTime(undefined);
        }
        return;
      }
      onHeld(selectedTime, { expiresAt: result.expiresAt, staffId: result.staffId });
    } catch {
      setError("No connection. Check your internet and try again.");
    } finally {
      turnstile.current?.reset();
      setHolding(false);
    }
  }

  return (
    <>
      {/* No original for this step: the cards, pills and bar of 08–12 (screen map). */}
      <section aria-label="Date" className="-mx-[22px]">
        <div
          className="flex gap-[10px] overflow-x-auto px-[22px] pb-1"
          role="radiogroup"
          aria-label="Date"
        >
          {days.map((day) => {
            const slots = byDay[day.date];
            const none = !loading && (slots === "error" || !slots || slots.length === 0);
            const on = date === day.date;
            return (
              <button
                key={day.date}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${day.weekday} ${day.dayOfMonth} ${day.month}${none ? ", no times" : ""}`}
                onClick={() => {
                  setPicked({ key, date: day.date });
                  setTime(undefined);
                }}
                className={`${cardClass(on)} press flex h-[72px] w-[60px] shrink-0 flex-col items-center justify-center ${
                  none && !on ? "opacity-40" : ""
                }`}
              >
                <span className="text-[14px] text-muted">{day.weekday}</span>
                <span className="text-[21px] font-semibold">{day.dayOfMonth}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Time" aria-busy={loading} className="mt-6">
        {loading ? (
          <div className="grid grid-cols-3 gap-[10px]" aria-label="Loading times">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="h-[42px] animate-pulse rounded-full bg-line" />
            ))}
          </div>
        ) : daySlots === "error" ? (
          <p className="text-[16px] text-danger">
            Couldn&apos;t load times. Check your connection and try again.
          </p>
        ) : times.length === 0 ? (
          <p className={`${cardClass(false)} p-5 text-[16px] text-muted`}>
            No free times on this day
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-[10px]" role="radiogroup" aria-label="Time">
            {times.map((startsAt) => {
              const on = selectedTime === startsAt;
              return (
                <button
                  key={startsAt}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTime(startsAt)}
                  className={`press h-[42px] rounded-full text-[16px] font-medium ${
                    on
                      ? "bg-select text-white"
                      : "border-[1.5px] border-line-strong bg-white text-ink"
                  }`}
                >
                  {formatTime(startsAt, salon.timezone)}
                </button>
              );
            })}
          </div>
        )}
        {!turnstileSiteKey ? (
          <p className="mt-3 text-[16px] text-danger">
            Online booking is temporarily unavailable. Try again later.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-[16px] text-danger">
            {error}
          </p>
        ) : null}
        {turnstileSiteKey ? <Turnstile ref={turnstile} siteKey={turnstileSiteKey} /> : null}
      </section>

      <BottomBar label="Your booking">
        <Total total={summary.total} count={summary.count} minutes={summary.minutes} />
        <button
          type="button"
          disabled={!selectedTime || holding || !turnstileSiteKey}
          onClick={() => void hold()}
          className={pillPrimary}
        >
          {holding ? "Holding…" : "Hold this time"}
        </button>
      </BottomBar>
    </>
  );
}
