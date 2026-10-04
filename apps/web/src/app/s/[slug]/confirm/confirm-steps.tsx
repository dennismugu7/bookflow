"use client";

import { formatKenyanPhone } from "@bookflow/shared";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  SignIn,
  heading,
  input,
  fieldLabel,
  lead,
  primary,
  useNow,
} from "../../../../components/sign-in";
import { firstName } from "../../../../lib/format";
import { phoneFromField } from "../../../../lib/phone-field";
import { createClient } from "../../../../lib/supabase/client";
import { countdown } from "../../../../lib/time";
import { confirmBooking, type ConfirmState } from "./actions";

type Props = {
  slug: string;
  salonName: string;
  expiresAt: string;
  pickTimeHref: string;
  signInFailed: boolean;
  /** Banner lines: "Mon 5 Oct, 10:45" and "Silk press - KES 1,500". */
  hold: { when: string; what: string };
  /** "Njeri will see this on the day." */
  seenBy: string;
  user: { email: string; name: string } | null;
  /** The signed-in client's saved name and phone at this salon (returning client, mockup 05). */
  profile: Profile | null;
};

type Profile = { fullName: string; phone: string };

/** "+254712345678" → "712 345 678", for the phone field that already shows "+254". */
function phoneForField(e164: string): string {
  const local = formatKenyanPhone(e164);
  return local.startsWith("0") ? local.slice(1) : "";
}

export function ConfirmSteps({
  slug,
  salonName,
  expiresAt,
  pickTimeHref,
  signInFailed,
  hold,
  seenBy,
  user,
  profile,
}: Props) {
  const now = useNow();
  const left = countdown(expiresAt, now);

  if (left.seconds === 0) {
    return (
      <section className="flex flex-col gap-4 px-[35px] pt-[52px]" aria-live="polite">
        <h1 className={heading}>Your hold expired</h1>
        <p className={lead}>We hold a time for 10 minutes. Pick a time again to continue.</p>
        <Link href={pickTimeHref} className={primary}>
          Pick another time
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="flex min-h-[61px] items-center gap-5 bg-[linear-gradient(90deg,#ffdd59,#ffb853_50%,#ff924d)] py-1.5 pr-4 pl-[29px] text-ink">
        <Clock className="size-[26px] shrink-0" strokeWidth={2} aria-hidden="true" />
        <div className="min-w-0 text-[15px] leading-[22px] font-medium">
          <p>
            {hold.when} · held for{" "}
            <span role="timer" aria-live="off" aria-label={`${left.label} left`}>
              {left.label}
            </span>
          </p>
          <p className="truncate">{hold.what}</p>
        </div>
      </div>
      {user ? (
        <Details
          slug={slug}
          user={user}
          profile={profile}
          pickTimeHref={pickTimeHref}
          seenBy={seenBy}
        />
      ) : (
        <SignIn
          title="Confirm your booking"
          lead="Sign in so you can view, change or cancel it later. It's free and takes a few seconds."
          footnote={`By continuing you agree to ${salonName}'s booking and cancellation terms.`}
          signInFailed={signInFailed}
        />
      )}
    </>
  );
}

function Details({
  slug,
  user,
  profile,
  pickTimeHref,
  seenBy,
}: {
  slug: string;
  user: { email: string; name: string };
  profile: Profile | null;
  pickTimeHref: string;
  seenBy: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState<ConfirmState, FormData>(confirmBooking, {});
  const [phone, setPhone] = useState(profile ? phoneForField(profile.phone) : "");
  const [phoneError, setPhoneError] = useState<string>();
  // A returning client confirms in one tap; "Change" opens the usual fields, prefilled.
  const [editing, setEditing] = useState(!profile);

  useEffect(() => {
    if (state.next === "signin") void supabase.auth.signOut().then(() => router.refresh());
  }, [state.next, supabase, router]);

  if (state.next === "expired") {
    return (
      <section className="flex flex-col gap-4 px-[35px] pt-[52px]" aria-live="polite">
        <h1 className={heading}>Your hold expired</h1>
        <p className={lead}>{state.message}</p>
        <Link href={pickTimeHref} className={primary}>
          Pick another time
        </Link>
      </section>
    );
  }

  const shownPhoneError = phoneError ?? state.fieldErrors?.phone;
  const signedInAs = (
    <p className="mt-2 px-[35px] text-center text-[13px] text-muted">
      Signed in as {user.email}.{" "}
      <button
        type="button"
        onClick={() => void supabase.auth.signOut().then(() => router.refresh())}
        className="press min-h-11 font-semibold underline"
      >
        Not you?
      </button>
    </p>
  );
  const errorMessage =
    state.message && (!state.next || state.next === "signin") ? (
      <p role="alert" className="mt-3 text-[15px] text-danger">
        {state.message}
      </p>
    ) : null;

  // Mockup 05; shown to first-time clients too (Dennis, 2026-10-04).
  const payNote = (
    <p className="px-5 pt-2 text-[13px] leading-[18px] font-medium text-muted">
      Pay at the salon. No payment is taken online.
    </p>
  );

  if (profile && !editing && !state.fieldErrors) {
    return (
      <>
        {payNote}
        <section
          className="mx-5 mt-[13px] rounded-[16px] border border-line bg-white px-[17px] pt-3 pb-[14px]"
          aria-labelledby="details-heading"
        >
          <h1 id="details-heading" className="text-[20px] leading-7 font-semibold">
            Welcome back, {firstName(profile.fullName)}
          </h1>
          <p className="text-[16px] leading-6 font-medium text-muted">{seenBy}</p>
          <div className="mt-[11px] flex min-h-[59px] items-center gap-3 rounded-[12px] bg-mist py-2 pr-1 pl-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] leading-5 font-semibold">{profile.fullName}</p>
              <p className="text-[14px] leading-5 font-medium text-muted">
                {formatKenyanPhone(profile.phone)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Change name or phone"
              className="press min-h-11 px-2.5 text-[16px] font-semibold text-action"
            >
              Change
            </button>
          </div>
          <form action={formAction} className="mt-4 flex flex-col">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="fullName" value={profile.fullName} />
            <input type="hidden" name="phone" value={profile.phone} />
            <button
              type="submit"
              disabled={pending}
              className="press flex h-[52px] w-full items-center justify-center rounded-[12px] bg-ink text-[16px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Confirming…" : "Confirm booking"}
            </button>
            {errorMessage}
          </form>
        </section>
        {signedInAs}
      </>
    );
  }

  return (
    <>
      {payNote}
      <div className="mt-[13px] bg-sand px-[11px] pt-1 pb-2">
        <section
          className="rounded-[16px] border border-line bg-white px-[21px] pt-5 pb-6"
          aria-labelledby="details-heading"
        >
          <h1 id="details-heading" className={heading}>
            What should we call you?
          </h1>
          <p className={lead}>{seenBy}</p>
          <form
            action={formAction}
            className="mt-[22px] flex flex-col"
            onSubmit={(e) => {
              if (!phoneFromField(phone)) {
                e.preventDefault();
                setPhoneError("Enter a phone number like 0712 345 678.");
              }
            }}
          >
            <input type="hidden" name="slug" value={slug} />
            <label htmlFor="fullName" className="sr-only">
              First name
            </label>
            <input
              id="fullName"
              name="fullName"
              className={input}
              placeholder="First name"
              defaultValue={profile?.fullName ?? (user.name ? firstName(user.name) : "")}
              autoComplete="given-name"
              maxLength={80}
              required
              aria-invalid={!!state.fieldErrors?.fullName}
            />
            {state.fieldErrors?.fullName ? (
              <p className="mt-1.5 text-[13px] text-danger">{state.fieldErrors.fullName}</p>
            ) : null}
            <label htmlFor="phone" className={`${fieldLabel} mt-4`}>
              Phone number
            </label>
            <div
              className={`mt-2 flex h-10 overflow-hidden rounded-[8px] border bg-white focus-within:border-2 focus-within:border-select ${
                shownPhoneError ? "border-danger" : "border-line-strong"
              }`}
            >
              <span
                className="flex items-center border-r border-line bg-sand px-3.5 text-[16px] font-medium"
                aria-hidden="true"
              >
                +254
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="min-w-0 flex-1 px-3.5 text-[16px] outline-none placeholder:text-muted"
                placeholder="712 345 678"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(undefined);
                }}
                aria-invalid={!!shownPhoneError}
                aria-describedby={shownPhoneError ? "phone-error" : undefined}
                required
              />
            </div>
            {shownPhoneError ? (
              <p id="phone-error" className="mt-1.5 text-[13px] text-danger">
                {shownPhoneError}
              </p>
            ) : null}
            <button type="submit" disabled={pending} className={`${primary} mt-[14px]`}>
              {pending ? "Confirming…" : "Confirm booking"}
            </button>
            {errorMessage}
          </form>
        </section>
      </div>
      {signedInAs}
    </>
  );
}
