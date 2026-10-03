import { Check, Plus } from "lucide-react";
import type { ReactNode } from "react";

/** Selected state from originals 09 and 12: a 28 px filled "Select" circle with a white check. */
export function SelectedCheck() {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-select text-white"
    >
      <Check className="size-4" strokeWidth={3} />
    </span>
  );
}

/** Not-yet-selected state for service cards: a 32 px outlined circle with a plus. */
export function AddCircle() {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-white shadow-sm"
    >
      <Plus className="size-4" strokeWidth={2.5} />
    </span>
  );
}

/** Card classes: white, rounded, with the 2 px "Select" border when chosen. */
export function cardClass(selected: boolean): string {
  return `rounded-[16px] bg-white ${selected ? "border-2 border-select" : "border border-line"}`;
}

/** Black pill button used for every main booking action. */
export const pillPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-base font-semibold text-white disabled:opacity-40";
/** Outline pill ("Book", "Select", "See all services"). */
export const pillOutline =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[15px] font-semibold text-ink";

/** Initials on lavender, for people and salons without a photo. */
export function Initials({ text, className }: { text: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-lavender font-bold text-brand ${className}`}
    >
      {text}
    </span>
  );
}

/** Fixed bottom bar with safe-area padding, as in the originals. */
export function BottomBar({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-[560px] items-center gap-4">{children}</div>
    </div>
  );
}
