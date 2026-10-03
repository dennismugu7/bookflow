"use client";

import { formatKes } from "@bookflow/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { choiceQuery } from "../../../../lib/booking-query";
import type { SalonService } from "../../../../lib/salon";
import { createClient } from "../../../../lib/supabase/client";
import { dayStrip, formatDuration, formatTime } from "../../../../lib/time";
import { BackLink, SummaryBar } from "../booking-ui";
import { Turnstile, type TurnstileHandle } from "./turnstile";

type Person = { id: string; name: string; title: string | null; photoUrl: string | null };
type Slot = { starts_at: string; staff_id: string };

type Props = {
  salon: { slug: string; name: string; timezone: string };
  services: SalonService[];
  staff: Person[];
  initialStaffId: string | null;
  turnstileSiteKey: string | null;
};

export function BookFlow({ salon, services, staff, initialStaffId, turnstileSiteKey }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const serviceIds = useMemo(() => services.map((s) => s.id), [services]);
  const days = useMemo(() => dayStrip(new Date(), salon.timezone), [salon.timezone]);
  const [staffId, setStaffId] = useState<string | null>(
    staff.length === 1 ? staff[0]!.id : initialStaffId,
  );
  // Results are tagged with the professional they were loaded for, so a change shows skeletons.
  const [availability, setAvailability] = useState<{
    key: string;
    byDay: Record<string, Slot[] | "error">;
  }>();
  const [picked, setPicked] = useState<{ key: string; date: string }>();
  const [holding, setHolding] = useState<string>();
  const [error, setError] = useState<string>();
  const turnstile = useRef<TurnstileHandle>(null);

  const minutes = services.reduce((sum, s) => sum + s.duration_min, 0);
  const total = services.reduce((sum, s) => sum + s.price_kes, 0);

  const key = staffId ?? "any";
  const loading = availability?.key !== key;
  const slotsByDay = useMemo(
    () => (loading ? {} : (availability?.byDay ?? {})),
    [loading, availability],
  );
  // The picked day, else the first day with free times.
  const date =
    picked?.key === key
      ? picked.date
      : loading
        ? undefined
        : (days.find((d) => {
            const slots = slotsByDay[d.date];
            return slots && slots !== "error" && slots.length > 0;
          })?.date ?? days[0]!.date);

  // Coming back here (e.g. to change the time) frees any hold this visitor still has.
  useEffect(() => {
    void fetch("/api/holds/release", { method: "POST" }).catch(() => undefined);
  }, []);

  // Load the next 14 days at once so days without times can be greyed out.
  useEffect(() => {
    let current = true;
    const key = staffId ?? "any";
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
  }, [supabase, salon.slug, serviceIds, staffId, days]);

  const hold = useCallback(
    async (startsAt: string) => {
      setError(undefined);
      setHolding(startsAt);
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
            startsAt,
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
          if (response.status === 409) {
            // Drop the taken time so it can't be picked again.
            setAvailability((a) => {
              const day = a && date ? a.byDay[date] : undefined;
              return a && date && day && day !== "error"
                ? {
                    ...a,
                    byDay: { ...a.byDay, [date]: day.filter((x) => x.starts_at !== startsAt) },
                  }
                : a;
            });
          }
          return;
        }
        router.push(
          `/s/${salon.slug}/confirm?${choiceQuery({
            serviceIds,
            staffId,
            startsAt,
            expiresAt: result.expiresAt,
            heldStaffId: result.staffId,
          })}`,
        );
      } catch {
        setError("No connection. Check your internet and try again.");
      } finally {
        turnstile.current?.reset();
        setHolding(undefined);
      }
    },
    [salon.slug, serviceIds, staffId, date, router],
  );

  const daySlots = date ? slotsByDay[date] : undefined;
  // With "any professional", several people can share a start time; show each time once.
  const times =
    daySlots && daySlots !== "error" ? [...new Set(daySlots.map((s) => s.starts_at))] : [];

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pt-4 pb-32">
      <BackLink href={`/s/${salon.slug}`} label={`Back to ${salon.name}`} />
      <h1 className="mt-2 text-[22px] font-bold">Choose a time</h1>

      {staff.length > 1 ? (
        <section aria-labelledby="pro-heading" className="mt-6 flex flex-col gap-3">
          <h2 id="pro-heading" className="text-[17px] font-bold">
            Professional
          </h2>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="radiogroup"
            aria-labelledby="pro-heading"
          >
            {[{ id: null, name: "Any professional", title: null }, ...staff].map((p) => {
              const on = staffId === p.id;
              return (
                <button
                  key={p.id ?? "any"}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setStaffId(p.id)}
                  className={`flex min-h-[52px] shrink-0 flex-col justify-center rounded-ds border px-4 text-left ${
                    on ? "border-2 border-select bg-brand-tint" : "border-line"
                  }`}
                >
                  <span className="text-[15px] font-bold">{p.name}</span>
                  {p.title ? <span className="text-[13px] text-muted">{p.title}</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : staff.length === 1 ? (
        <p className="mt-2 text-[15px] text-muted">With {staff[0]!.name}</p>
      ) : null}

      <section aria-labelledby="date-heading" className="mt-6 flex flex-col gap-3">
        <h2 id="date-heading" className="text-[17px] font-bold">
          Date
        </h2>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          role="radiogroup"
          aria-labelledby="date-heading"
        >
          {days.map((day) => {
            const slots = slotsByDay[day.date];
            const none = !loading && (slots === "error" || !slots || slots.length === 0);
            const on = date === day.date;
            return (
              <button
                key={day.date}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${day.weekday} ${day.dayOfMonth} ${day.month}${none ? ", no times" : ""}`}
                onClick={() => setPicked({ key, date: day.date })}
                className={`flex min-h-[72px] w-16 shrink-0 flex-col items-center justify-center rounded-ds border ${
                  on ? "border-2 border-select bg-brand-tint" : "border-line"
                } ${none ? "text-muted opacity-60" : ""}`}
              >
                <span className="text-[13px] font-medium">{day.weekday}</span>
                <span className="text-[17px] font-bold">{day.dayOfMonth}</span>
                <span className="text-[11px]">{none ? "No times" : day.month}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="time-heading"
        className="mt-6 flex flex-col gap-3"
        aria-busy={loading}
      >
        <h2 id="time-heading" className="text-[17px] font-bold">
          Time
        </h2>
        {loading ? (
          <div className="grid grid-cols-3 gap-2" aria-label="Loading times">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-ds bg-surface" />
            ))}
          </div>
        ) : daySlots === "error" ? (
          <p className="text-[15px] text-danger">
            Couldn&apos;t load times. Check your connection and try again.
          </p>
        ) : times.length === 0 ? (
          <p className="rounded-ds bg-surface p-4 text-[15px] text-muted">
            No free times on this day
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {times.map((startsAt) => (
              <button
                key={startsAt}
                type="button"
                disabled={!!holding || !turnstileSiteKey}
                onClick={() => void hold(startsAt)}
                className="min-h-12 rounded-ds border border-line text-[15px] font-semibold disabled:opacity-50"
              >
                {holding === startsAt ? "Holding…" : formatTime(startsAt, salon.timezone)}
              </button>
            ))}
          </div>
        )}
        {!turnstileSiteKey ? (
          <p className="text-[15px] text-danger">
            Online booking is temporarily unavailable. Try again later.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        ) : null}
        {turnstileSiteKey ? <Turnstile ref={turnstile} siteKey={turnstileSiteKey} /> : null}
      </section>

      <SummaryBar
        lines={[
          `${services.map((s) => s.name).join(", ")}`,
          `${formatDuration(minutes)} · ${formatKes(total)}`,
        ]}
      />
    </main>
  );
}
