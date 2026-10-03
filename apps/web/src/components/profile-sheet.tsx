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
        className="relative max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-t-[24px] bg-surface motion-safe:animate-[sheet-up_200ms_ease-out]"
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
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
        <button
          ref={closeButton}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 left-3 flex size-11 items-center justify-center rounded-full"
        >
          <X className="size-6" />
        </button>
        <div className="flex flex-col items-center gap-2 px-6 pt-12 pb-8 text-center">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs
            <img src={profile.photoUrl} alt="" className="size-40 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-40 items-center justify-center rounded-full bg-lavender text-5xl font-bold text-brand"
            >
              {initials(profile.name)}
            </span>
          )}
          <h2 id="profile-name" className="mt-4 text-[24px] font-bold">
            {profile.name}
          </h2>
          {profile.title ? <p className="text-[16px]">{profile.title}</p> : null}
        </div>
        <div className="bg-white px-6 pt-6 pb-[max(32px,env(safe-area-inset-bottom))]">
          <h3 className="text-[18px] font-bold">About</h3>
          <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">
            {profile.bio ?? `${profile.name} hasn't added an introduction yet.`}
          </p>
        </div>
      </div>
    </div>
  );
}
