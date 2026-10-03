import { ArrowLeft, Clock, X } from "lucide-react";

const bar = "block animate-pulse rounded-full bg-line";

/** Shown at once while the confirm page loads; copies the layout of original 16. */
export default function ConfirmLoading() {
  return (
    <div className="min-h-full flex-1 bg-white" aria-busy="true">
      <main className="mx-auto w-full max-w-[560px] pb-16">
        <p className="sr-only" role="status">
          Loading
        </p>
        <div className="relative h-[121px] pt-[29px] pl-[53px]" aria-hidden="true">
          <span className="absolute top-0 left-0 flex h-[45px] w-[44px] items-center justify-center bg-surface">
            <ArrowLeft className="size-6" strokeWidth={2.25} />
          </span>
          <span className="absolute top-0 right-0 flex h-[51px] w-[52px] items-center justify-center bg-surface">
            <X className="size-6" strokeWidth={2.25} />
          </span>
          <span className={`${bar} h-6 w-36`} />
          <span className={`${bar} mt-2.5 h-4 w-44`} />
          <span className={`${bar} mt-2.5 h-3 w-20`} />
        </div>
        <div
          className="flex h-[61px] items-center gap-5 bg-[linear-gradient(90deg,#ffdd59,#ffb853_50%,#ff924d)] pl-[29px]"
          aria-hidden="true"
        >
          <Clock className="size-[26px] shrink-0" strokeWidth={2} />
          <span className="flex flex-col gap-2">
            <span className="block h-3.5 w-48 rounded-full bg-white/50" />
            <span className="block h-3.5 w-60 rounded-full bg-white/50" />
          </span>
        </div>
        <div className="flex flex-col gap-4 px-[35px] pt-14" aria-hidden="true">
          <span className={`${bar} h-6 w-52`} />
          <span className={`${bar} h-4 w-full`} />
          <span className="mt-4 h-[39px] rounded-[8px] border border-line" />
          <span className="h-[42px] rounded-[10px] bg-line" />
        </div>
      </main>
    </div>
  );
}
