"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { slideAlt, slideIndex } from "../lib/slider";

type Props = { name: string; photos: string[] };

/**
 * The salon hero (original 01, owner-v6 04): a scroll-snap slider of the salon photos at 4:3,
 * with dots and a "1/n" counter. Swipe on phones; ‹ › on hover and the arrow keys on computers.
 * No slider library: the browser's scroll snapping does the work.
 */
export function PhotoSlider({ name, photos }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const many = count > 1;

  function go(to: number) {
    const el = track.current;
    if (!el) return;
    const target = Math.min(count - 1, Math.max(0, to));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  }

  return (
    <div className="group relative">
      <div
        ref={track}
        role={many ? "region" : undefined}
        aria-roledescription={many ? "carousel" : undefined}
        aria-label={many ? `${name} photos` : undefined}
        tabIndex={many ? 0 : undefined}
        onKeyDown={many ? onKeyDown : undefined}
        onScroll={(e) =>
          setIndex(slideIndex(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, count))
        }
        className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs; no image optimiser on the free plan
          <img
            key={src}
            src={src}
            alt={slideAlt(name, i, count)}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            decoding={i === 0 ? "sync" : "async"}
            className="h-full w-full shrink-0 snap-start snap-always object-cover"
          />
        ))}
      </div>

      {many ? (
        <>
          {/* Sits 16 px above the white sheet, which overlaps the hero by 28 px. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[44px] left-1/2 flex -translate-x-1/2 items-center gap-[5px]"
          >
            {photos.map((src, i) => (
              <span
                key={src}
                className={`h-[5px] rounded-full transition-all ${i === index ? "w-[18px] bg-white" : "w-[5px] bg-white/60"}`}
              />
            ))}
          </div>
          <p
            aria-live="polite"
            className="pointer-events-none absolute right-[16px] bottom-[44px] flex h-[27px] items-center rounded-full bg-black/55 px-3 text-[15px] font-medium text-white"
          >
            <span className="sr-only">Photo </span>
            {index + 1}/{count}
          </p>
          <ArrowButton side="left" disabled={index === 0} onClick={() => go(index - 1)} />
          <ArrowButton side="right" disabled={index === count - 1} onClick={() => go(index + 1)} />
        </>
      ) : null}
    </div>
  );
}

/** ‹ and ›, shown on hover where there is a mouse (hidden on touch screens). */
function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 disabled:!opacity-0 [@media(hover:hover)]:flex ${side === "left" ? "left-3" : "right-3"}`}
    >
      <Icon className="size-5" strokeWidth={2.5} />
    </button>
  );
}
