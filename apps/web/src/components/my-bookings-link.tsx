import Link from "next/link";

/** The small "My bookings" link at the foot of every client page (phase 3b). */
export function MyBookingsLink({ className = "" }: { className?: string }) {
  return (
    <footer className={`flex justify-center ${className}`}>
      <Link
        href="/me"
        className="press inline-flex min-h-11 items-center px-3 text-[13px] font-medium text-muted underline"
      >
        My bookings
      </Link>
    </footer>
  );
}
