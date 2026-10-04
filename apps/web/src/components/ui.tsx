import { Check, Plus } from "lucide-react";
import type { ReactNode } from "react";

/** Selected state from originals 09 and 12: a 39 px filled purple circle with a white check. */
export function SelectedCheck() {
  return (
    <span
      aria-hidden="true"
      className="flex size-[39px] shrink-0 items-center justify-center rounded-full bg-select text-white"
    >
      <Check className="size-5" strokeWidth={2} />
    </span>
  );
}

/** Not-yet-selected state for service cards (original 08): a 37 px white circle with a soft shadow. */
export function AddCircle() {
  return (
    <span
      aria-hidden="true"
      className="flex size-[37px] shrink-0 items-center justify-center rounded-full border border-line bg-white shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
    >
      <Plus className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/** Plain card on the white pages: 1 px #E7E6EC outline, 14 px corners (Dennis, 2026-10-04). */
export const card = "rounded-[14px] border border-card-line bg-white";

/** Card classes (originals 02 and 08–12) on white; the 2.5 px purple border when chosen. */
export function cardClass(selected: boolean): string {
  return selected ? "rounded-[14px] border-[2.5px] border-select bg-white" : card;
}

/** Black pill for the main booking actions ("Continue →", original 09). */
export const pillPrimary =
  "press inline-flex h-[53px] items-center justify-center gap-3 rounded-full bg-ink px-[22px] text-[18px] font-semibold text-white disabled:opacity-40";
/** Outline pill ("Book" in 02, "Select" in 10). */
export const pillOutline =
  "press inline-flex h-[42px] items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white px-[18px] text-[16px] font-medium text-ink";

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

/** Service name, duration and price, stacked as in originals 02 and 08. */
export function ServiceText({
  name,
  duration,
  price,
}: {
  name: string;
  duration: string;
  price: string;
}) {
  return (
    <span className="block min-w-0 flex-1">
      <span className="block text-[17px] leading-[22px] font-semibold">{name}</span>
      <span className="mt-[14px] block text-[15px] leading-5 font-medium tracking-[0.06em] text-muted">
        {duration}
      </span>
      <span className="mt-3 block text-[20px] leading-[26px] font-bold text-price">{price}</span>
    </span>
  );
}

/**
 * Fixed white bottom bar with safe-area padding (originals 09 and 12); a 1 px top line keeps cards
 * from looking cut off as they scroll under it on the white page.
 */
export function BottomBar({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-card-line bg-white px-[22px] pt-[14px] pb-[max(9px,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-[516px] items-center gap-4">{children}</div>
    </div>
  );
}

/** Title of each booking step (originals 08, 10): 31 px bold. */
export const flowTitle = "mt-1 text-[31px] leading-[38px] font-bold tracking-[-0.01em]";

/** Back arrow and × in one row above the title (originals 08, 10). */
export function FlowTopBar({ back, close }: { back: ReactNode; close: ReactNode }) {
  return (
    <div className="-mx-2 flex h-[62px] items-center justify-between">
      {back}
      {close}
    </div>
  );
}
