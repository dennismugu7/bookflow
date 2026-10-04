"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LAST_SALON_KEY, backTarget } from "../lib/back-nav";

type NavigationLike = {
  currentEntry: { index: number } | null;
  entries(): { url: string | null }[];
};

/** The page before this one in this tab, when the browser can tell us (Navigation API). */
function previousEntryUrl(): string | null {
  const nav = (window as { navigation?: NavigationLike }).navigation;
  const index = nav?.currentEntry?.index ?? 0;
  return index > 0 ? (nav?.entries()[index - 1]?.url ?? null) : null;
}

function lastSalon(): string | null {
  try {
    return window.localStorage.getItem(LAST_SALON_KEY);
  } catch {
    return null;
  }
}

/** Back arrow for My bookings: the previous page, else the last salon visited (Dennis, 2026-10-04). */
export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        const target = backTarget({
          previousUrl: previousEntryUrl(),
          currentUrl: window.location.href,
          lastSalon: lastSalon(),
        });
        if (target.kind === "history") router.back();
        else router.push(target.href);
      }}
      className={`press flex size-11 shrink-0 items-center justify-center rounded-full active:bg-ink/5 ${className}`}
    >
      <ArrowLeft className="size-[26px]" strokeWidth={2.5} />
    </button>
  );
}

/** Remembers this salon so My bookings can return to it. */
export function RememberSalon({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_SALON_KEY, slug);
    } catch {
      // Private mode or blocked storage: the back arrow falls back to the home page.
    }
  }, [slug]);
  return null;
}
