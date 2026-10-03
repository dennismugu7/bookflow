import Link from "next/link";

/** Back arrow with an accessible label, as in the original booking screens. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-3 flex size-11 items-center justify-center rounded-full"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/** Sticky summary of what is being booked. */
export function SummaryBar({ lines }: { lines: string[] }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[560px]">
        {lines.map((line, i) => (
          <p
            key={i}
            className={i === 0 ? "truncate text-[15px] font-bold" : "text-[13px] text-muted"}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
