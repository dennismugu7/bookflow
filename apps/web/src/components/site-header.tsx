import Link from "next/link";

/** The plain site header of the legal and account pages (owner-v7 06, 07). */
export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-[60px] w-full max-w-[680px] items-center px-5">
        <Link href="/" className="press text-[21px] font-bold text-brand">
          Bookflow
        </Link>
      </div>
    </header>
  );
}
