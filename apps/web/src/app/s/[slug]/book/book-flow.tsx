"use client";

import { formatKes } from "@bookflow/shared";
import { ArrowLeft, ArrowRight, ShoppingCart, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CloseButton } from "../../../../components/close-button";
import { ProfileSheet, type Profile } from "../../../../components/profile-sheet";
import {
  AddCircle,
  BottomBar,
  Initials,
  SelectedCheck,
  cardClass,
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
  initial: { serviceIds: string[]; staffId: string | null; step: Step };
  turnstileSiteKey: string | null;
};

const TITLES: Record<Step, string> = {
  services: "Select services",
  pro: "Select professional",
  time: "Pick a time",
};

export function BookFlow({ salon, services, staff, initial, turnstileSiteKey }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [serviceIds, setServiceIds] = useState(initial.serviceIds);
  const [chosenStaffId, setChosenStaffId] = useState<string | null>(initial.staffId);
  const [step, setStep] = useState<Step>(initial.step);
  const [profile, setProfile] = useState<Profile | null>(null);
  const closeProfile = useCallback(() => setProfile(null), []);

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

  // Keep the choices in the URL so a refresh or the Google round-trip doesn't lose them.
  useEffect(() => {
    const query = `${choiceQuery({ serviceIds, staffId })}&step=${step}`;
    router.replace(`/s/${salon.slug}/book?${query}`, { scroll: false });
  }, [router, salon.slug, serviceIds, staffId, step]);

  // Coming back here (e.g. to change the time) frees any hold this visitor still has.
  useEffect(() => {
    void fetch("/api/holds/release", { method: "POST" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const back = () => setStep(step === "time" && showPro ? "pro" : "services");

  return (
    <div className="min-h-full flex-1 bg-surface">
      <main className="mx-auto w-full max-w-[560px] px-4 pt-3 pb-32">
        <div className="flex items-center justify-between">
          {step === "services" ? (
            <Link
              href={`/s/${salon.slug}`}
              aria-label={`Back to ${salon.name}`}
              className="-ml-2 flex size-11 items-center justify-center rounded-full"
            >
              <ArrowLeft className="size-6" />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className="-ml-2 flex size-11 items-center justify-center rounded-full"
            >
              <ArrowLeft className="size-6" />
            </button>
          )}
          <CloseButton salonHref={`/s/${salon.slug}`} />
        </div>
        <h1 className="mt-3 mb-5 text-[28px] leading-tight font-bold">{TITLES[step]}</h1>

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
            summary={{ total, line: cartSummary(chosen.length, minutes) }}
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
      </main>

      {step !== "time" ? (
        <BottomBar label="Your booking">
          <Total total={total} line={cartSummary(chosen.length, minutes)} />
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => setStep(step === "services" && showPro ? "pro" : "time")}
            className={pillPrimary}
          >
            Continue <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </BottomBar>
      ) : null}

      <ProfileSheet profile={profile} onClose={closeProfile} />
    </div>
  );
}

function Total({ total, line }: { total: number; line: string }) {
  return (
    <div className="min-w-0 flex-1" aria-live="polite">
      <p className="text-[18px] font-bold">{formatKes(total)}</p>
      <p className="flex items-center gap-1 text-[13px] text-muted">
        <ShoppingCart className="size-3.5" aria-hidden="true" /> {line}
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
    <ul className="flex flex-col gap-3">
      {services.map((service) => {
        const on = selected.includes(service.id);
        return (
          <li key={service.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => toggle(service.id)}
              className={`${cardClass(on)} flex w-full items-center gap-3 p-4 text-left`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{service.name}</span>
                <span className="mt-1 block text-[14px] text-muted">
                  {formatDuration(service.duration_min)}
                </span>
                <span className="mt-1 block text-[16px] font-semibold">
                  {formatKes(service.price_kes)}
                </span>
              </span>
              {on ? <SelectedCheck /> : <AddCircle />}
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
  return (
    <ul className="flex flex-col gap-3">
      <li className={`${cardClass(staffId === null)} flex items-center gap-4 p-4`}>
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lavender text-select"
        >
          <Shuffle className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Any professional</span>
          <span className="block truncate text-[14px] text-muted">Maximum availability</span>
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
          <li key={person.id} className={`${cardClass(on)} flex items-center gap-4 p-4`}>
            {person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs
              <img
                src={person.photoUrl}
                alt=""
                className="size-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <Initials text={initials(person.name)} className="size-14 text-lg" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{person.name}</span>
              {person.title ? (
                <span className="block truncate text-[14px] text-muted">{person.title}</span>
              ) : null}
              <button
                type="button"
                onClick={() => viewProfile(person)}
                className="min-h-11 text-[14px] font-semibold text-ink underline underline-offset-2"
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
    <button type="button" onClick={onSelect} aria-label={`Select ${label}`} className={pillOutline}>
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
  summary: { total: number; line: string };
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
      <section aria-label="Date" className="-mx-4">
        <div className="flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Date">
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
                className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-ds ${
                  on ? "bg-ink text-white" : "border border-line bg-white"
                } ${none && !on ? "opacity-40" : ""}`}
              >
                <span className="text-[12px] font-medium">{day.weekday}</span>
                <span className="text-[18px] font-bold">{day.dayOfMonth}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Time" aria-busy={loading} className="mt-5">
        {loading ? (
          <div className="grid grid-cols-3 gap-2" aria-label="Loading times">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-full bg-white" />
            ))}
          </div>
        ) : daySlots === "error" ? (
          <p className="text-[15px] text-danger">
            Couldn&apos;t load times. Check your connection and try again.
          </p>
        ) : times.length === 0 ? (
          <p className="rounded-[16px] bg-white p-4 text-[15px] text-muted">
            No free times on this day
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Time">
            {times.map((startsAt) => {
              const on = selectedTime === startsAt;
              return (
                <button
                  key={startsAt}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTime(startsAt)}
                  className={`min-h-11 rounded-full text-[15px] font-semibold ${
                    on ? "bg-select text-white" : "border border-line bg-white"
                  }`}
                >
                  {formatTime(startsAt, salon.timezone)}
                </button>
              );
            })}
          </div>
        )}
        {!turnstileSiteKey ? (
          <p className="mt-3 text-[15px] text-danger">
            Online booking is temporarily unavailable. Try again later.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-[15px] text-danger">
            {error}
          </p>
        ) : null}
        {turnstileSiteKey ? <Turnstile ref={turnstile} siteKey={turnstileSiteKey} /> : null}
      </section>

      <BottomBar label="Your booking">
        <Total total={summary.total} line={summary.line} />
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
