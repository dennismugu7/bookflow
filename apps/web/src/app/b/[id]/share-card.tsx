"use client";

import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { whatsappShareUrl } from "../../../lib/format";

/** "Know someone who'd love …?" card from original 20: copy, WhatsApp and the share sheet. */
export function ShareCard({ salonName, link }: { salonName: string; link: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const message = `Book at ${salonName} in a minute, no app needed:`;

  return (
    <section
      aria-labelledby="share-heading"
      className="rounded-[16px] border border-line bg-white p-5"
    >
      <h2 id="share-heading" className="text-[17px] font-semibold">
        Know someone who&apos;d love <strong>{salonName}</strong>?
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        Share the link. They can book in a minute, no app needed.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-ds border border-line bg-surface p-2 pl-3">
        <label htmlFor="share-link" className="sr-only">
          Booking link
        </label>
        <input
          id="share-link"
          readOnly
          value={link.replace(/^https:\/\//, "")}
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
        />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => setCopied(true));
          }}
          className="min-h-11 rounded-ds border border-line bg-white px-4 text-[14px] font-semibold"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={whatsappShareUrl(message, link)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 flex-1 items-center justify-center rounded-ds bg-whatsapp text-base font-semibold text-ink"
        >
          WhatsApp
        </a>
        <button
          type="button"
          aria-label={`Share ${salonName}`}
          onClick={() => {
            if (navigator.share)
              void navigator
                .share({ title: salonName, text: message, url: link })
                .catch(() => undefined);
            else void navigator.clipboard?.writeText(link).then(() => setCopied(true));
          }}
          className="flex size-12 shrink-0 items-center justify-center rounded-ds border border-line bg-white"
        >
          <Share2 className="size-5" />
        </button>
      </div>
    </section>
  );
}
