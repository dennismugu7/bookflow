import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { initials } from "../lib/format";

type Props = {
  name: string;
  address: string | null;
  logoUrl: string | null;
  /** Back arrow target; omit to hide it. */
  backHref?: string;
  /** The × button; omit to hide it. */
  close?: React.ReactNode;
};

/** Salon name, address and logo, with optional back and ×, as on the confirm and booked pages. */
export function SalonHeader({ name, address, logoUrl, backHref, close }: Props) {
  return (
    <header className="bg-white px-4 pt-3 pb-4">
      {backHref || close ? (
        <div className="mb-2 flex items-center justify-between">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Back"
              className="-ml-2 flex size-11 items-center justify-center rounded-full"
            >
              <ArrowLeft className="size-6" />
            </Link>
          ) : (
            <span />
          )}
          {close ?? null}
        </div>
      ) : null}
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[20px] leading-tight font-bold">{name}</p>
          {address ? <p className="mt-1 truncate text-[13px] text-muted">{address}</p> : null}
        </div>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs; no image optimiser on the free plan
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="size-14 shrink-0 rounded-ds object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-ds bg-lavender text-lg font-bold text-brand"
          >
            {initials(name)}
          </span>
        )}
      </div>
    </header>
  );
}
