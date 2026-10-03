"use client";

import { MessageCircle, Share2 } from "lucide-react";
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
      className="mx-1.5 rounded-[12px] border border-line bg-white px-[14px] pt-[17px] pb-[14px]"
    >
      <h2 id="share-heading" className="text-[15.5px] leading-5 font-medium">
        Know someone who&apos;d love <strong className="font-bold">{salonName}</strong>?
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-[15px] text-muted">
        Share your link — they can browse services and book in a minute, no app to download.
      </p>
      <div className="mt-3 flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white pr-2 pl-2.5">
        <label htmlFor="share-link" className="sr-only">
          Booking link
        </label>
        <input
          id="share-link"
          readOnly
          value={link.replace(/^https:\/\//, "")}
          className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-ink outline-none"
        />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => setCopied(true));
          }}
          className="press -my-2 flex min-h-11 items-center"
        >
          <span className="rounded-[6px] border border-line-strong bg-white px-2 py-0.5 text-[13px]">
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
      <div className="mt-2.5 flex gap-2">
        <a
          href={whatsappShareUrl(message, link)}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-whatsapp text-[15px] font-bold text-ink"
        >
          <MessageCircle className="size-[18px]" strokeWidth={2.25} aria-hidden="true" />
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
          className="press flex size-11 shrink-0 items-center justify-center rounded-[8px] border border-line-strong bg-white"
        >
          <Share2 className="size-[18px]" strokeWidth={2.25} />
        </button>
      </div>
    </section>
  );
}
