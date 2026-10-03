"use client";

import { formatKes } from "@bookflow/shared";
import Link from "next/link";
import { useState } from "react";

import { choiceQuery } from "../../../lib/booking-query";
import type { SalonService } from "../../../lib/salon";
import { formatDuration } from "../../../lib/time";

export function ServicePicker({ slug, services }: { slug: string; services: SalonService[] }) {
  // Kept in the order the client picks them; that is the order of the appointment.
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = selected
    .map((id) => services.find((s) => s.id === id))
    .filter((s) => s !== undefined);
  const minutes = chosen.reduce((sum, s) => sum + s.duration_min, 0);
  const total = chosen.reduce((sum, s) => sum + s.price_kes, 0);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  return (
    <>
      <ul className="flex flex-col gap-2">
        {services.map((service) => {
          const on = selected.includes(service.id);
          return (
            <li key={service.id}>
              <label
                className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-ds border px-4 py-3 ${
                  on ? "border-2 border-select bg-brand-tint" : "border-line bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(service.id)}
                  className="size-5 shrink-0 accent-[var(--select)]"
                />
                <span className="flex flex-1 flex-col">
                  <span className="text-[17px] font-bold">{service.name}</span>
                  <span className="text-[13px] text-muted">
                    {formatDuration(service.duration_min)}
                  </span>
                </span>
                <span className="text-[15px] font-semibold">{formatKes(service.price_kes)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {chosen.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-[560px] items-center gap-4">
            <div className="flex-1" aria-live="polite">
              <p className="text-[15px] font-bold">
                {chosen.length} {chosen.length === 1 ? "service" : "services"} · {formatKes(total)}
              </p>
              <p className="text-[13px] text-muted">{formatDuration(minutes)}</p>
            </div>
            <Link
              href={`/s/${slug}/book?${choiceQuery({ serviceIds: selected, staffId: null })}`}
              className="flex min-h-[52px] items-center rounded-ds bg-ink px-5 text-base font-bold text-white"
            >
              Choose a time
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
