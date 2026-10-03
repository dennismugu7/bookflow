import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { shortArea } from "../lib/short-area";

type Identity = {
  name: string;
  tagline: string | null;
  address: string | null;
  logoUrl: string | null;
};

/**
 * Name, tagline and area stacked tightly, with the logo just right of that block
 * (originals 01, 16, 18 and 21). `as` lets the salon page make the name its h1.
 */
export function SalonIdentity({
  name,
  tagline,
  address,
  logoUrl,
  as: Name = "p",
}: Identity & { as?: "h1" | "p" }) {
  const area = shortArea(address);
  const line = tagline?.trim() || null;
  return (
    <div className="flex items-center gap-[30px]">
      <div className="min-w-0">
        <Name className="text-[22px] leading-7 font-semibold">{name}</Name>
        {line ? <p className="mt-0.5 text-[16px] leading-5 font-medium text-ink">{line}</p> : null}
        {area ? (
          <p className="mt-1.5 text-[11px] leading-4 font-medium tracking-[0.08em] text-muted">
            {area}
          </p>
        ) : null}
      </div>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs; no image optimiser on the free plan
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="h-[68px] w-auto max-w-[80px] shrink-0 object-contain"
        />
      ) : null}
    </div>
  );
}

type Props = Identity & {
  /** Back arrow target; omit to hide it. */
  backHref?: string;
  /** The × button; omit to hide it. */
  close?: React.ReactNode;
};

/**
 * The salon header on confirm (16, 18) and "You're all set" (21): back arrow top left, × top right
 * and the identity block share one row.
 */
export function SalonHeader({ backHref, close, ...identity }: Props) {
  return (
    <header className="relative bg-white pt-[23px] pr-[56px] pb-4 pl-[53px]">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Back"
          className="press absolute top-0 left-0 flex size-11 items-center justify-center rounded-full active:bg-ink/5"
        >
          <ArrowLeft className="size-[26px]" strokeWidth={2.5} />
        </Link>
      ) : null}
      {close ? <div className="absolute top-0 right-0">{close}</div> : null}
      <SalonIdentity {...identity} />
    </header>
  );
}
