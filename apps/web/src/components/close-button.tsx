"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * × in the booking flow: leaves for the salon page at once and releases any hold this visitor has
 * in the background (`keepalive` lets the request finish after the page changes).
 */
export function CloseButton({ salonHref, tile = false }: { salonHref: string; tile?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    router.prefetch(salonHref);
  }, [router, salonHref]);
  return (
    <button
      type="button"
      aria-label="Close and go back to the salon"
      onClick={() => {
        void fetch("/api/holds/release", { method: "POST", keepalive: true }).catch(
          () => undefined,
        );
        router.push(salonHref);
      }}
      className={`press flex items-center justify-center ${
        tile ? "h-[51px] w-[52px] bg-surface" : "size-11"
      }`}
    >
      <X className="size-[26px]" strokeWidth={2.5} />
    </button>
  );
}
