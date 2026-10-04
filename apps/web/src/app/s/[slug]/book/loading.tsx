import { ArrowLeft, X } from "lucide-react";

import { FlowTopBar, cardClass } from "../../../../components/ui";

const bar = "block animate-pulse rounded-full bg-line";

/** Shown at once while a booking step loads; copies the layout of original 08. */
export default function BookLoading() {
  return (
    <div className="min-h-full flex-1 bg-white" aria-busy="true">
      <main className="mx-auto w-full max-w-[560px] px-[22px] pb-32">
        <FlowTopBar
          back={
            <span className="flex size-11 items-center justify-center" aria-hidden="true">
              <ArrowLeft className="size-[26px]" strokeWidth={2.25} />
            </span>
          }
          close={
            <span className="flex size-11 items-center justify-center" aria-hidden="true">
              <X className="size-6" strokeWidth={2.25} />
            </span>
          }
        />
        <p className="sr-only" role="status">
          Loading
        </p>
        <span className={`${bar} mt-2 h-8 w-[205px]`} />
        <ul className="mt-7 flex flex-col gap-[13px]">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className={`${cardClass(false)} flex h-[120px] items-center gap-3 pr-[17px] pl-5`}
            >
              <span className="flex flex-1 flex-col gap-4">
                <span className={`${bar} h-4 w-[70%]`} />
                <span className={`${bar} h-3.5 w-16`} />
                <span className={`${bar} h-5 w-20`} />
              </span>
              <span className="size-[37px] shrink-0 rounded-full border border-line bg-white" />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
