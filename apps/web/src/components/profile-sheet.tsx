"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { initials } from "../lib/format";

export type Profile = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
};

/**
 * Bottom sheet with a professional's photo, name, title and About (original 11).
 * Closes with ×, Esc, a tap on the backdrop or a downward swipe.
 */
export function ProfileSheet({
  profile,
  onClose,
}: {
  profile: Profile | null;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [profile, onClose]);

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close profile"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-name"
        className="relative flex max-h-[calc(100dvh-6px)] min-h-[calc(100dvh-6px)] w-full max-w-[560px] flex-col overflow-y-auto rounded-t-[30px] bg-surface motion-safe:animate-[sheet-up_200ms_ease-out]"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          const end = e.changedTouches[0]?.clientY;
          if (start !== null && end !== undefined && end - start > 80) onClose();
          touchStart.current = null;
        }}
      >
        <button
          ref={closeButton}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="press absolute top-5 left-[19px] flex size-11 items-center justify-center rounded-full"
        >
          <X className="size-5" strokeWidth={2.75} />
        </button>
        <div className="flex flex-col items-center px-6 pt-[110px] pb-16 text-center">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs
            <img src={profile.photoUrl} alt="" className="size-[205px] rounded-full object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-[205px] items-center justify-center rounded-full bg-lavender text-6xl font-bold text-brand"
            >
              {initials(profile.name)}
            </span>
          )}
          <h2 id="profile-name" className="mt-7 text-[22px] leading-7 font-bold">
            {profile.name}
          </h2>
          {profile.title ? (
            <p className="mt-2 text-[16px] leading-6 font-medium">{profile.title}</p>
          ) : null}
        </div>
        <div className="flex-1 bg-white px-[26px] pt-5 pb-[max(32px,env(safe-area-inset-bottom))]">
          <h3 className="text-[17px] leading-6 font-bold">About</h3>
          <p className="mt-1 pl-[3px] text-[13px] leading-[15px] font-medium whitespace-pre-line">
            {profile.bio ?? `${profile.name} hasn't added an introduction yet.`}
          </p>
        </div>
      </div>
    </div>
  );
}
