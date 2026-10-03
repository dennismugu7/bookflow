"use client";

import { formatKes } from "@bookflow/shared";
import { Clock, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Initials, cardClass, pillOutline } from "../../../components/ui";
import { ProfileSheet, type Profile } from "../../../components/profile-sheet";
import { choiceQuery } from "../../../lib/booking-query";
import { initials } from "../../../lib/format";
import { describeOpenStatus, openStatus, type HoursRow } from "../../../lib/open-status";
import type { SalonService } from "../../../lib/salon";
import { formatDuration } from "../../../lib/time";

/** Current minute on the client; null while rendering on the server (pages are cached). */
function useMinute(): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const timer = setInterval(onChange, 30_000);
      return () => clearInterval(timer);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

/** Web Share API, else copy the link with a "Link copied" toast. */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setToast(true);
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Share ${title}`}
        onClick={() => void share()}
        className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-md"
      >
        <Share2 className="size-5" />
      </button>
      {toast ? (
        <p
          role="status"
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white"
        >
          Link copied
        </p>
      ) : null}
    </>
  );
}

/** "Open · until 18:00" or "Closed · opens Mon 09:00", worked out on the phone in the salon's timezone. */
export function OpenStatusLine({ hours, timeZone }: { hours: HoursRow[]; timeZone: string }) {
  const minute = useMinute();
  if (minute === null) return <p className="h-5" aria-hidden="true" />;
  const now = new Date(minute * 60_000);
  const status = openStatus(hours, now, timeZone);
  const today = isoDay(now, timeZone);
  const { label, detail } = describeOpenStatus(status, today);
  return (
    <p className="flex items-center gap-2 text-[14px]">
      <Clock className="size-4 text-ink" aria-hidden="true" />
      <span className={`font-semibold ${status.open ? "text-success" : "text-danger"}`}>
        {label}
      </span>
      {detail ? <span className="text-muted">· {detail}</span> : null}
    </p>
  );
}

function isoDay(now: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone }).format(now);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short) + 1;
}

/** About text clamped to 4 lines, with "Read more" only when it is long. */
export function AboutText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 220 || text.split("\n").length > 4;
  return (
    <div>
      <p
        className={`text-[15px] leading-relaxed whitespace-pre-line ${!open && long ? "line-clamp-4" : ""}`}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-1 min-h-11 text-[15px] font-semibold text-brand"
        >
          {open ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

const TABS = [
  { id: "services", label: "Services" },
  { id: "team", label: "Team" },
  { id: "hours", label: "Hours & location" },
];

/** Sticky section tabs with scroll-spy; the active tab gets an ink underline. */
export function SectionTabs({ hasTeam }: { hasTeam: boolean }) {
  const tabs = useMemo(() => (hasTeam ? TABS : TABS.filter((t) => t.id !== "team")), [hasTeam]);
  const [active, setActive] = useState(tabs[0]!.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-56px 0px -60% 0px" },
    );
    for (const tab of tabs) {
      const el = document.getElementById(tab.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-10 -mx-4 border-b border-line bg-white px-4"
    >
      <ul className="flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <a
              href={`#${tab.id}`}
              aria-current={active === tab.id ? "true" : undefined}
              onClick={() => setActive(tab.id)}
              className={`flex min-h-12 items-center border-b-2 text-[15px] whitespace-nowrap ${
                active === tab.id
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent text-muted"
              }`}
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Service cards with a "Book" pill; the first five, then "See all services (n)". */
export function ServicesSection({ slug, services }: { slug: string; services: SalonService[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? services : services.slice(0, 5);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {shown.map((service) => (
          <li key={service.id} className={`${cardClass(false)} flex items-center gap-3 p-4`}>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold">{service.name}</p>
              <p className="mt-1 text-[14px] text-muted">{formatDuration(service.duration_min)}</p>
              <p className="mt-1 text-[16px] font-semibold">{formatKes(service.price_kes)}</p>
            </div>
            <Link
              href={`/s/${slug}/book?${choiceQuery({ serviceIds: [service.id], staffId: null })}`}
              aria-label={`Book ${service.name}`}
              className={pillOutline}
            >
              Book
            </Link>
          </li>
        ))}
      </ul>
      {!all && services.length > 5 ? (
        <button type="button" onClick={() => setAll(true)} className={`${pillOutline} w-full`}>
          See all services ({services.length})
        </button>
      ) : null}
    </div>
  );
}

/** A row of team members; tapping one opens their profile sheet (original 11). */
export function TeamSection({ team }: { team: Profile[] }) {
  const [open, setOpen] = useState<Profile | null>(null);
  const close = useCallback(() => setOpen(null), []);
  return (
    <>
      <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
        {team.map((person) => (
          <li key={person.id} className="w-[88px] shrink-0">
            <button
              type="button"
              onClick={() => setOpen(person)}
              aria-label={`${person.name}${person.title ? `, ${person.title}` : ""}. View profile`}
              className="flex w-full flex-col items-center gap-2 text-center"
            >
              {person.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs
                <img
                  src={person.photoUrl}
                  alt=""
                  className="size-[72px] rounded-full object-cover"
                />
              ) : (
                <Initials text={initials(person.name)} className="size-[72px] text-xl" />
              )}
              <span className="w-full">
                <span className="block truncate text-[14px] font-semibold">{person.name}</span>
                {person.title ? (
                  <span className="block truncate text-[12px] text-muted">{person.title}</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ProfileSheet profile={open} onClose={close} />
    </>
  );
}
