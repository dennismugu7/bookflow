"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** × in the booking flow: releases any hold this visitor has, then returns to the salon page. */
export function CloseButton({ salonHref }: { salonHref: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  return (
    <button
      type="button"
      aria-label="Close and go back to the salon"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        void fetch("/api/holds/release", { method: "POST" })
          .catch(() => undefined)
          .finally(() => router.push(salonHref));
      }}
      className="-mr-2 flex size-11 items-center justify-center rounded-full"
    >
      <X className="size-6" />
    </button>
  );
}
