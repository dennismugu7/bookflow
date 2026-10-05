"use client";

import {
  DELETION_DETAILS_MAX,
  DELETION_REASONS,
  SUPPORT_EMAIL,
  canContinueDeletion,
  deletionConfirmParts,
  deletionCounter,
  deletionStatement,
  upcomingWarningParts,
  type DeletionReason,
  type DeletionSummary,
  type TextPart,
} from "@bookflow/shared";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CodeStep, useEmailCode } from "../../components/sign-in";
import { createClient } from "../../lib/supabase/client";

const button =
  "press flex h-[52px] w-full items-center justify-center gap-1.5 text-[16px] font-semibold text-white disabled:opacity-50";
const mainButton = `${button} rounded-full`;
const iconButton = "press flex size-11 items-center justify-center rounded-full active:bg-ink/5";
const support = (
  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-action-blue">
    {SUPPORT_EMAIL}
  </a>
);

function Parts({ parts }: { parts: TextPart[] }) {
  return parts.map((p, i) =>
    p.bold ? (
      <strong key={i} className="font-bold text-ink">
        {p.text}
      </strong>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

type Step = "reasons" | "confirm" | "deleted";

export function DeleteAccountFlow({
  signedIn,
  summary,
}: {
  signedIn: boolean;
  summary: DeletionSummary | null;
}) {
  const [step, setStep] = useState<Step>("reasons");
  const [reason, setReason] = useState<DeletionReason>();
  const [details, setDetails] = useState("");

  if (step === "deleted") return <Deleted />;
  if (!signedIn) return <EmailStep />;
  if (step === "confirm")
    return (
      <Confirm
        summary={summary}
        reason={reason}
        details={details}
        onBack={() => setStep("reasons")}
        onDeleted={() => setStep("deleted")}
      />
    );
  return (
    <Reasons
      reason={reason}
      details={details}
      onReason={setReason}
      onDetails={setDetails}
      onContinue={() => setStep("confirm")}
    />
  );
}

/** 06: email, then the existing 6-digit code step; the server then renders the reasons. */
function EmailStep() {
  const flow = useEmailCode();
  const [email, setEmail] = useState("");
  if (flow.sentTo) return <CodeStep flow={flow} className="px-[22px] pt-[26px]" />;
  return (
    <section
      className="px-[22px] pt-[24px] text-[15px] leading-[22px]"
      aria-labelledby="delete-heading"
    >
      <h1 id="delete-heading" className="text-[26px] leading-[33px] font-bold">
        Delete your Bookflow account
      </h1>
      <p className="mt-[10px]">
        For clients and salon owners. Sign in with the email you use on Bookflow, then confirm.
      </p>
      <form
        className="mt-[16px] flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void flow.sendCode(email.trim().toLowerCase());
        }}
      >
        <label htmlFor="email" className="text-[15px] font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="mt-[8px] h-[52px] w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-[17px] text-[16px] outline-none placeholder:text-muted focus:border-2 focus:border-action-blue"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={flow.busy}
          className={`${button} mt-4 rounded-[10px] bg-action-blue`}
        >
          {flow.busy ? "Sending…" : "Send me a code"}
        </button>
      </form>
      {flow.error ? (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {flow.error}
        </p>
      ) : null}
      <h2 className="mt-[26px] text-[18px] leading-6 font-bold">What is deleted</h2>
      <ul className="mt-[8px] flex flex-col gap-[6px]">
        <li className="relative pl-[13px] before:absolute before:left-0 before:content-['·']">
          <strong className="font-semibold">Clients:</strong> your sign-in and your link to your
          bookings. Salons keep the visit records they need, without your account.
        </li>
        <li className="relative pl-[13px] before:absolute before:left-0 before:content-['·']">
          <strong className="font-semibold">Salon owners:</strong> your sign-in and your salon, with
          its bookings, clients and photos.
        </li>
      </ul>
      <p className="mt-4 text-[14px] leading-[17px] text-muted">
        Deletion is immediate. Backups are cleared within 30 days. Questions: {support}
      </p>
    </section>
  );
}

/** 03 in the web layout: why are you leaving. */
function Reasons({
  reason,
  details,
  onReason,
  onDetails,
  onContinue,
}: {
  reason: DeletionReason | undefined;
  details: string;
  onReason: (r: DeletionReason) => void;
  onDetails: (d: string) => void;
  onContinue: () => void;
}) {
  const router = useRouter();
  const counter = deletionCounter(details);
  return (
    <section className="flex flex-1 flex-col px-[22px] pt-[10px]" aria-labelledby="reasons-heading">
      <div className="flex justify-end">
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.push("/")}
          className={iconButton}
        >
          <X className="size-[26px]" strokeWidth={2.5} />
        </button>
      </div>
      <p className="mt-[5px] text-[20px] font-semibold">Delete my account</p>
      <h1 id="reasons-heading" className="mt-[23px] text-[30px] leading-9 font-bold">
        We&apos;re sad to see you go!
      </h1>
      <p className="mt-[10px] text-[16px] leading-[23px] text-muted">
        If there&apos;s anything we could do to make things right, we&apos;d love to hear from you.
        Reach out anytime at {SUPPORT_EMAIL}
      </p>
      <fieldset className="mt-[23px]">
        <legend className="text-[20px] font-semibold">Help us improve</legend>
        <p className="mt-[10px] text-[16px] leading-[18px] text-muted">
          Please let us know the reason for deleting your account:
        </p>
        <div className="mt-[10px] flex flex-col">
          {DELETION_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex min-h-11 cursor-pointer items-start gap-[14px] py-[8px]"
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => onReason(r.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="mt-[1px] flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-line-strong peer-checked:border-0 peer-checked:bg-action-blue peer-focus-visible:outline-2 peer-focus-visible:outline-action-blue"
              >
                {reason === r.value ? <span className="size-2 rounded-full bg-white" /> : null}
              </span>
              <span className="text-[17px] leading-[22px]">{r.label}</span>
            </label>
          ))}
        </div>
        {reason === "other" ? (
          <div className="mt-[6px] ml-[36px]">
            <textarea
              aria-label="Tell us more"
              value={details}
              maxLength={DELETION_DETAILS_MAX}
              onChange={(e) => onDetails(e.target.value)}
              rows={2}
              className="block h-[69px] w-full resize-none rounded-[12px] border border-line-strong px-[15px] py-[12px] text-[16px] outline-none focus:border-action-blue"
            />
            {counter ? <p className="mt-1 text-right text-[13px] text-muted">{counter}</p> : null}
          </div>
        ) : null}
      </fieldset>
      <div className="mt-auto border-t border-line pt-[15px] pb-6">
        <button
          type="button"
          disabled={!canContinueDeletion(reason, details)}
          onClick={onContinue}
          className={`${mainButton} bg-action-blue`}
        >
          Continue <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/** 04 in the web layout: name what goes, tick, delete. */
function Confirm({
  summary,
  reason,
  details,
  onBack,
  onDeleted,
}: {
  summary: DeletionSummary | null;
  reason: DeletionReason | undefined;
  details: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(
    summary ? undefined : "Couldn't load your account. Refresh the page and try again.",
  );
  const salons = summary?.salons ?? [];
  const warning = upcomingWarningParts(salons);

  async function remove() {
    if (!reason || !summary) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setError(body?.message ?? "Couldn't delete your account. Try again.");
        setBusy(false);
        return;
      }
      await createClient()
        .auth.signOut({ scope: "local" })
        .catch(() => undefined);
      onDeleted();
    } catch {
      setError("Couldn't delete your account. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col px-[22px] pt-[10px]" aria-labelledby="confirm-heading">
      <div className="flex justify-between">
        <button type="button" aria-label="Back" onClick={onBack} className={iconButton}>
          <ArrowLeft className="size-[26px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.push("/")}
          className={iconButton}
        >
          <X className="size-[26px]" strokeWidth={2.5} />
        </button>
      </div>
      <h1 id="confirm-heading" className="mt-[38px] text-[22px] leading-7 font-semibold">
        Delete your Bookflow account
      </h1>
      <p className="mt-[18px] text-[15px] leading-[23px] text-muted">
        <Parts parts={deletionConfirmParts(salons)} />
      </p>
      <label className="mt-[24px] flex cursor-pointer items-start gap-[14px]">
        <input
          type="checkbox"
          checked={ticked}
          onChange={(e) => setTicked(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-line-strong peer-checked:border-0 peer-checked:bg-action-blue peer-focus-visible:outline-2 peer-focus-visible:outline-action-blue"
        >
          {ticked ? <Check className="size-4 text-white" strokeWidth={3} /> : null}
        </span>
        <span className="text-[16px] leading-[22px]">{deletionStatement(salons.length)}</span>
      </label>
      {warning ? (
        <p className="mt-[22px] rounded-[14px] bg-attention-tint px-[14px] py-[12px] text-[14px] leading-5">
          <Parts parts={warning} />
        </p>
      ) : null}
      <div className="mt-auto border-t border-line pt-[15px] pb-6">
        {error ? (
          <p role="alert" className="mb-3 text-[15px] text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!ticked || busy || !summary}
          onClick={() => void remove()}
          className={`${mainButton} bg-danger`}
        >
          {busy ? (
            <span
              className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-label="Deleting"
            />
          ) : (
            "Delete account"
          )}
        </button>
      </div>
    </section>
  );
}

/** 05: done. */
function Deleted() {
  const router = useRouter();
  return (
    <section className="flex flex-1 flex-col px-[22px]" aria-labelledby="deleted-heading">
      <div className="flex flex-1 flex-col items-center justify-center pt-10 text-center">
        <span
          aria-hidden="true"
          className="flex size-28 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#86c2ff,#1e7bf2_60%,#1a6ee0)]"
        >
          <Check className="size-12 text-white" strokeWidth={2.5} />
        </span>
        <h1 id="deleted-heading" className="mt-8 text-[28px] leading-[35px] font-bold">
          Your account has been deleted
        </h1>
        <p className="mt-[14px] max-w-[330px] text-[15px] leading-6 text-muted">
          We&apos;ll miss you around here! If you need anything at all before you head out, feel
          free to reach out to {SUPPORT_EMAIL}.
        </p>
      </div>
      <div className="mt-10 border-t border-line pt-[15px] pb-6">
        <button
          type="button"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          className={`${mainButton} bg-action-blue`}
        >
          Done
        </button>
      </div>
    </section>
  );
}
