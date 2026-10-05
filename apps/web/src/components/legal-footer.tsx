import Link from "next/link";

const link =
  "press inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-muted underline";

/** Privacy and Terms, at the foot of the salon page, My bookings and the sign-in pages. */
export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex justify-center gap-2 ${className}`}>
      <Link href="/privacy" className={link}>
        Privacy
      </Link>
      <Link href="/terms" className={link}>
        Terms
      </Link>
    </nav>
  );
}
