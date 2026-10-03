"use client";

import { Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

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
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Rectangular buttons and fields of originals 16 and 18 (not pills). */
const button =
  "press flex h-[42px] w-full items-center justify-center gap-2.5 rounded-[10px] text-[15px] font-semibold disabled:opacity-40";
const outline = `${button} border border-line-strong bg-white font-medium`;
const primary = `${button} bg-ink text-white`;
const input =
  "h-10 w-full rounded-[8px] border border-line-strong bg-white px-4 text-[16px] outline-none placeholder:text-muted focus:border-2 focus:border-select";
const fieldLabel = "text-[13px] font-semibold text-muted";
const heading = "text-[19px] leading-6 font-semibold";
const lead = "mt-1.5 text-[14px] leading-5 font-medium text-muted";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Google's "G" as an outline, like the icon in original 16. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
      <path
        d="M20.4 12.2c0-.6 0-1.2-.2-1.7H12v3.3h4.7a4 4 0 0 1-1.7 2.6M12 3a9 9 0 1 0 6.4 15.4M17.9 6.1A8.9 8.9 0 0 0 12 3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
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
        <Details slug={slug} user={user} pickTimeHref={pickTimeHref} seenBy={seenBy} />
      ) : (
        <SignIn salonName={salonName} signInFailed={signInFailed} />
      )}
    </>
  );
}

function SignIn({ salonName, signInFailed }: { salonName: string; signInFailed: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [sentAt, setSentAt] = useState(0);
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(
    signInFailed ? "Google sign-in didn't finish. Try again or use your email." : undefined,
  );
  const now = useNow();
  const resendIn = Math.max(0, Math.ceil((sentAt + 60_000 - now.getTime()) / 1000));

  async function google() {
    setError(undefined);
    const next = `${window.location.pathname}${window.location.search}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) setError("Couldn't open Google sign-in. Try again or use your email.");
  }

  async function sendCode(address: string) {
    if (!EMAIL.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (sendError) {
      setError(
        sendError.status === 429
          ? "Wait a minute before asking for another code."
          : "Couldn't send the code. Check the address and try again.",
      );
      return;
    }
    setSentTo(address);
    setSentAt(Date.now());
    setCode("");
  }

  async function verify(token: string) {
    if (!sentTo || token.length !== 6) return;
    setBusy(true);
    setError(undefined);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: sentTo,
      token,
      type: "email",
    });
    setBusy(false);
    if (verifyError) {
      setError(
        verifyError.status === 429
          ? "Too many tries. Wait a minute and try again."
          : "That code is wrong or has expired. Check the latest email or ask for a new code.",
      );
      setCode("");
      return;
    }
    // The session cookie is set; the server now renders the details step.
    router.refresh();
  }

  if (sentTo) {
    const active = Math.min(code.length, 5);
    return (
      <section className="px-[35px] pt-[52px]" aria-labelledby="code-heading">
        <h1 id="code-heading" className={heading}>
          Check your email
        </h1>
        <p className={lead}>
          We sent a 6-digit code to <strong className="text-ink">{sentTo}</strong>. It&apos;s from
          Bookflow and expires in 10 minutes.
        </p>
        <form
          className="mt-6 flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
        >
          <label htmlFor="otp" className={fieldLabel}>
            6-digit code
          </label>
          {/* Six boxes as in the sign-in design; one invisible input on top takes typing and paste. */}
          <div className="relative mt-2 flex gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`flex h-[52px] flex-1 items-center justify-center rounded-[10px] bg-white text-[22px] font-bold ${
                  focused && i === active ? "border-2 border-select" : "border border-line-strong"
                }`}
              >
                {code[i] ?? ""}
              </span>
            ))}
            <input
              id="otp"
              className="absolute inset-0 h-full w-full caret-transparent opacity-0"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(next);
                if (next.length === 6) void verify(next);
              }}
              autoFocus
            />
          </div>
          <p className="mt-2 text-[13px] text-muted">Tip: you can paste the whole code.</p>
          <button type="submit" disabled={busy || code.length !== 6} className={`${primary} mt-5`}>
            {busy ? "Checking…" : "Verify"}
          </button>
        </form>
        {error ? (
          <p role="alert" className="mt-3 text-[15px] text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-4 text-[15px]">
          <button
            type="button"
            disabled={resendIn > 0 || busy}
            onClick={() => void sendCode(sentTo)}
            className="press min-h-11 text-muted enabled:font-semibold enabled:text-brand"
          >
            {resendIn > 0 ? `Resend code in 0:${String(resendIn).padStart(2, "0")}` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSentTo(undefined);
              setError(undefined);
            }}
            className="press min-h-11 font-semibold text-brand underline"
          >
            Use a different email
          </button>
        </div>
        <p className="mt-10 text-center text-[13px] text-muted">
          Can&apos;t find it? Check your spam or promotions folder.
        </p>
      </section>
    );
  }

  return (
    <section className="px-[35px] pt-[52px]" aria-labelledby="signin-heading">
      <h1 id="signin-heading" className={heading}>
        Confirm your booking
      </h1>
      <p className={lead}>
        Sign in so you can view, change or cancel it later. It&apos;s free and takes a few seconds.
      </p>
      <button type="button" onClick={() => void google()} className={`${outline} mt-6`}>
        <GoogleMark /> Continue with Google
      </button>
      <div className="my-4 flex items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or use your email
        <span className="h-px flex-1 bg-line" />
      </div>
      <form
        className="flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode(email.trim().toLowerCase());
        }}
      >
        <label htmlFor="email" className={fieldLabel}>
          Email
        </label>
        <input
          id="email"
          type="email"
          className={`${input} mt-2`}
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={busy} className={`${primary} mt-3`}>
          {busy ? "Sending…" : "Email me a code"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {error}
        </p>
      ) : null}
      <p className="mt-10 text-center text-[13px] leading-[18px] text-muted">
        By continuing you agree to {salonName}&apos;s booking and cancellation terms.
      </p>
    </section>
  );
}

function Details({
  slug,
  user,
  pickTimeHref,
  seenBy,
}: {
  slug: string;
  user: { email: string; name: string };
  pickTimeHref: string;
  seenBy: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState<ConfirmState, FormData>(confirmBooking, {});
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>();

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

  return (
    <>
      <div className="mt-[27px] bg-sand px-[11px] pt-1 pb-2">
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
              defaultValue={user.name ? firstName(user.name) : ""}
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
            {state.message && (!state.next || state.next === "signin") ? (
              <p role="alert" className="mt-3 text-[15px] text-danger">
                {state.message}
              </p>
            ) : null}
          </form>
        </section>
      </div>
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
    </>
  );
}
