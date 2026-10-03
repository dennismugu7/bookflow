"use client";

import { formatKes } from "@bookflow/shared";
import { Clock, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Initials, ServiceText, cardClass, pillOutline } from "../../../components/ui";
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
        className="press absolute top-[21px] right-[70px] flex size-[39px] items-center justify-center rounded-full bg-[#ebebeb]/95 text-ink"
      >
        <Share2 className="size-5" strokeWidth={2.25} />
      </button>
      {toast ? (
        <p
          role="status"
          className="fixed bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white"
        >
          Link copied
        </p>
      ) : null}
    </>
  );
}

/** "Open  until 18:00" or "Closed  opens Mon 09:00", worked out on the phone in the salon's timezone. */
export function OpenStatusLine({ hours, timeZone }: { hours: HoursRow[]; timeZone: string }) {
  const minute = useMinute();
  if (minute === null) return <p className="h-6" aria-hidden="true" />;
  const now = new Date(minute * 60_000);
  const status = openStatus(hours, now, timeZone);
  const today = isoDay(now, timeZone);
  const { label, detail } = describeOpenStatus(status, today);
  return (
    <p className="flex h-6 items-center text-[15px] font-medium tracking-[0.04em]">
      <Clock className="size-5 text-ink" strokeWidth={2.25} aria-hidden="true" />
      <span className={`ml-2 ${status.open ? "text-open" : "text-danger"}`}>{label}</span>
      {detail ? <span className="ml-3 text-until">{detail}</span> : null}
    </p>
  );
}

function isoDay(now: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone }).format(now);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short) + 1;
}

const ABOUT_PREVIEW = 200;

/** About text cut to about four lines, ending "… Read more" inline (original 01). */
export function AboutText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > ABOUT_PREVIEW + 20;
  const preview = long ? text.slice(0, text.lastIndexOf(" ", ABOUT_PREVIEW)).trimEnd() : text;
  return (
    <p className="mt-[23px] text-[13px] leading-[15px] font-medium whitespace-pre-line">
      {open || !long ? text : `${preview}…`}
      {long ? (
        <>
          {" "}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="press font-bold text-read-more"
          >
            {open ? "Show less" : "Read more"}
          </button>
        </>
      ) : null}
    </p>
  );
}

const TABS = [
  { id: "services", label: "Services" },
  { id: "team", label: "Team" },
  { id: "hours", label: "Hours & location" },
];

/** A section counts as reached once its top is this close to the top (tab bar plus its scroll margin). */
const REACHED = 120;

/**
 * Sticky section tabs (originals 02–07) with scroll-spy: the active tab is the last section whose
 * top has reached the bar, or the last one once the page can't scroll further.
 */
export function SectionTabs({ hasTeam }: { hasTeam: boolean }) {
  const tabs = useMemo(() => (hasTeam ? TABS : TABS.filter((t) => t.id !== "team")), [hasTeam]);
  const [active, setActive] = useState(tabs[0]!.id);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = tabs[0]!.id;
      for (const tab of tabs) {
        const el = document.getElementById(tab.id);
        if (el && el.getBoundingClientRect().top <= REACHED) current = tab.id;
      }
      setActive(atBottom && window.scrollY > 0 ? tabs[tabs.length - 1]!.id : current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [tabs]);

  return (
    <nav aria-label="Sections" className="sticky top-0 z-10 bg-white">
      <ul className="flex h-[55px] gap-7 overflow-x-auto px-[21px]">
        {tabs.map((tab) => (
          <li key={tab.id} className="flex">
            <a
              href={`#${tab.id}`}
              aria-current={active === tab.id ? "true" : undefined}
              className={`press flex items-start border-b-[3px] pt-[17px] text-[16px] leading-5 font-bold whitespace-nowrap ${
                active === tab.id ? "border-ink" : "border-transparent"
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

const SERVICES_PREVIEW = 3;

/** Service cards with a "Book" pill (originals 02, 03); the first three, then "See all". */
export function ServicesSection({ slug, services }: { slug: string; services: SalonService[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? services : services.slice(0, SERVICES_PREVIEW);
  return (
    <>
      <ul className="flex flex-col gap-[13px]">
        {shown.map((service) => (
          <li
            key={service.id}
            className={`${cardClass(false)} flex items-center gap-3 pt-[14px] pr-[13px] pb-3 pl-5`}
          >
            <ServiceText
              name={service.name}
              duration={formatDuration(service.duration_min)}
              price={formatKes(service.price_kes)}
            />
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
      {!all && services.length > SERVICES_PREVIEW ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="press mt-[26px] flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white text-[17px] font-semibold"
        >
          See all
        </button>
      ) : null}
    </>
  );
}

const TEAM_PREVIEW = 3;

/** The team row (originals 03, 04); tapping someone opens their profile sheet (original 11). */
export function TeamSection({ team, headingClass }: { team: Profile[]; headingClass: string }) {
  const [open, setOpen] = useState<Profile | null>(null);
  const [all, setAll] = useState(false);
  const close = useCallback(() => setOpen(null), []);
  return (
    <>
      <div className="flex items-center justify-between pr-[50px]">
        <h2 id="team-heading" className={headingClass}>
          Team
        </h2>
        {team.length > TEAM_PREVIEW ? (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
            className="press min-h-11 text-[16px] font-medium text-link"
          >
            {all ? "Show less" : "See all"}
          </button>
        ) : null}
      </div>
      <ul
        className={`mt-[13px] flex gap-[13px] px-10 ${all ? "flex-wrap justify-center" : "overflow-x-auto"}`}
      >
        {team.map((person) => (
          <li key={person.id} className="w-[100px] shrink-0">
            <button
              type="button"
              onClick={() => setOpen(person)}
              aria-label={`${person.name}${person.title ? `, ${person.title}` : ""}. View profile`}
              className="press flex w-full flex-col items-center text-center"
            >
              {person.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs
                <img
                  src={person.photoUrl}
                  alt=""
                  className="size-[88px] rounded-full object-cover"
                />
              ) : (
                <Initials text={initials(person.name)} className="size-[88px] text-2xl" />
              )}
              <span className="mt-[15px] block w-full truncate text-[16px] leading-5 font-medium">
                {person.name}
              </span>
              {person.title ? (
                <span className="mt-1.5 block w-full truncate text-[12px] leading-4 font-medium tracking-[0.1em] text-muted">
                  {person.title}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <ProfileSheet profile={open} onClose={close} />
    </>
  );
}

/** "Ready for a fresh look?" bar with the glossy BOOK NOW pill (originals 01–07). */
export function BookNowBar({ slug, count }: { slug: string; count: number }) {
  return (
    <div
      role="region"
      aria-label="Book"
      className="fixed inset-x-0 bottom-0 z-20 bg-white pb-[max(26px,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-[560px]">
        <div aria-hidden="true" className="mr-[46px] ml-[30px] h-0.5 bg-ink" />
        <div className="flex items-center justify-between gap-3 pt-[24px] pr-[33px] pl-8">
          <p className="text-[16px] leading-[18px] font-semibold italic">
            Ready for a fresh look?
            <br />
            Check out our {count} {count === 1 ? "service" : "services"}
          </p>
          <Link
            href={`/s/${slug}/book`}
            prefetch
            className="press flex min-h-11 shrink-0 items-center"
          >
            <span className="flex h-[27px] items-center rounded-full border-2 border-[#111] bg-[linear-gradient(#4d4d4d,#2b2b2b_48%,#101010_52%,#1c1c1c)] px-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_2px_rgba(0,0,0,0.4)]">
              <span className="bg-[linear-gradient(#ffe88f,#f5c84f_55%,#dfa52c)] bg-clip-text text-[15px] leading-none font-bold text-transparent uppercase">
                Book now
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
