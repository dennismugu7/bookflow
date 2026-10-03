"use client";

import { Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { phoneFromField } from "../../../../lib/phone-field";
import { createClient } from "../../../../lib/supabase/client";
import { countdown } from "../../../../lib/time";
import { confirmBooking, type ConfirmState } from "./actions";

type Props = {
  slug: string;
  expiresAt: string;
  pickTimeHref: string;
  signInFailed: boolean;
  /** Banner lines: "Mon 5 Oct, 10:45" and "Silk press – KES 1,500". */
  hold: { when: string; what: string };
  /** "Njeri will see this on the day." */
  seenBy: string;
  user: { email: string; name: string } | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const button =
  "flex min-h-[52px] w-full items-center justify-center rounded-full text-base font-semibold disabled:opacity-40";
const card = "mx-4 mt-4 flex flex-col gap-4 rounded-[16px] bg-white p-5";
const input =
  "h-[52px] w-full rounded-ds border border-line bg-white px-4 text-[15px] outline-none focus:border-2 focus:border-select";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function ConfirmSteps({
  slug,
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
      <section className={card} aria-live="polite">
        <h2 className="text-[22px] font-bold">Your hold expired</h2>
        <p className="text-[15px] text-muted">
          We hold a time for 10 minutes. Pick a time again to continue.
        </p>
        <Link href={pickTimeHref} className={`${button} bg-ink text-white`}>
          Pick another time
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 bg-gradient-to-r from-[#FBD34D] to-[#F0A030] px-5 py-3 text-ink">
        <Clock className="size-7 shrink-0" aria-hidden="true" />
        <div className="min-w-0 text-[15px]">
          <p>
            {hold.when} · held for{" "}
            <strong role="timer" aria-live="off" aria-label={`${left.label} left`}>
              {left.label}
            </strong>
          </p>
          <p className="truncate">{hold.what}</p>
        </div>
      </div>
      <p className="mx-4 mt-2 text-[13px] text-muted">
        Pay at the salon. No payment is taken online.
      </p>
      {user ? (
        <Details slug={slug} user={user} pickTimeHref={pickTimeHref} seenBy={seenBy} />
      ) : (
        <SignIn signInFailed={signInFailed} />
      )}
    </>
  );
}

function SignIn({ signInFailed }: { signInFailed: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [sentAt, setSentAt] = useState(0);
  const [code, setCode] = useState("");
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
    return (
      <section className={card} aria-labelledby="code-heading">
        <div>
          <h2 id="code-heading" className="text-[22px] font-bold">
            Check your email
          </h2>
          <p className="mt-1 text-[15px] text-muted">
            We sent a 6-digit code to <strong className="text-ink">{sentTo}</strong>. It&apos;s from
            Bookflow and expires in 10 minutes.
          </p>
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
        >
          <label htmlFor="otp" className="text-sm font-bold">
            6-digit code
          </label>
          <input
            id="otp"
            className={`${input} text-center text-2xl font-bold tracking-[0.5em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(next);
              if (next.length === 6) void verify(next);
            }}
            autoFocus
          />
          <p className="text-[13px] text-muted">Tip: you can paste the whole code.</p>
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className={`${button} bg-ink text-white`}
          >
            {busy ? "Checking…" : "Verify"}
          </button>
        </form>
        {error ? (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-4 text-[15px]">
          <button
            type="button"
            disabled={resendIn > 0 || busy}
            onClick={() => void sendCode(sentTo)}
            className="min-h-11 text-muted disabled:opacity-70 enabled:font-bold enabled:text-brand"
          >
            {resendIn > 0 ? `Resend code in 0:${String(resendIn).padStart(2, "0")}` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSentTo(undefined);
              setError(undefined);
            }}
            className="min-h-11 font-bold text-brand underline"
          >
            Use a different email
          </button>
        </div>
        <p className="text-center text-[13px] text-muted">
          Can&apos;t find it? Check your spam or promotions folder.
        </p>
      </section>
    );
  }

  return (
    <section className={card} aria-labelledby="signin-heading">
      <div>
        <h2 id="signin-heading" className="text-[22px] font-bold">
          Sign in to confirm
        </h2>
        <p className="mt-1 text-[15px] text-muted">
          So you can view your booking later. It&apos;s free and takes a few seconds.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void google()}
        className={`${button} border border-line bg-white`}
      >
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or use your email
        <span className="h-px flex-1 bg-line" />
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode(email.trim().toLowerCase());
        }}
      >
        <label htmlFor="email" className="text-sm font-bold">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={input}
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={busy} className={`${button} bg-ink text-white`}>
          {busy ? "Sending…" : "Email me a code"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      ) : null}
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
      <section className={card} aria-live="polite">
        <h2 className="text-[22px] font-bold">Your hold expired</h2>
        <p className="text-[15px] text-muted">{state.message}</p>
        <Link href={pickTimeHref} className={`${button} bg-ink text-white`}>
          Pick another time
        </Link>
      </section>
    );
  }

  const shownPhoneError = phoneError ?? state.fieldErrors?.phone;

  return (
    <section className={card} aria-labelledby="details-heading">
      <p className="text-[13px] font-semibold text-success">Signed in as {user.email}</p>
      <div>
        <h2 id="details-heading" className="text-[22px] font-bold">
          What should we call you?
        </h2>
        <p className="mt-1 text-[15px] text-muted">{seenBy}</p>
      </div>
      <form
        action={formAction}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          if (!phoneFromField(phone)) {
            e.preventDefault();
            setPhoneError("Enter a phone number like 0712 345 678.");
          }
        }}
      >
        <input type="hidden" name="slug" value={slug} />
        <div className="flex flex-col gap-2">
          <label htmlFor="fullName" className="text-sm font-bold">
            Your name
          </label>
          <input
            id="fullName"
            name="fullName"
            className={input}
            defaultValue={user.name}
            autoComplete="name"
            maxLength={80}
            required
            aria-invalid={!!state.fieldErrors?.fullName}
          />
          {state.fieldErrors?.fullName ? (
            <p className="text-[13px] text-danger">{state.fieldErrors.fullName}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="text-sm font-bold">
            Phone number
          </label>
          <div
            className={`flex h-[52px] overflow-hidden rounded-ds border bg-white focus-within:border-2 focus-within:border-select ${
              shownPhoneError ? "border-danger" : "border-line"
            }`}
          >
            <span
              className="flex items-center border-r border-line bg-surface px-4 text-[15px] font-bold"
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
              className="min-w-0 flex-1 px-4 text-[15px] outline-none"
              placeholder="700 000 021"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError(undefined);
              }}
              aria-invalid={!!shownPhoneError}
              aria-describedby="phone-help"
              required
            />
          </div>
          <p
            id="phone-help"
            className="rounded-ds border border-dashed border-line-strong px-3 py-2 text-[13px] text-muted"
          >
            We&apos;ll use this to reach you about your booking. You can type 07… or +254…
          </p>
          {shownPhoneError ? <p className="text-[13px] text-danger">{shownPhoneError}</p> : null}
        </div>
        <button type="submit" disabled={pending} className={`${button} bg-ink text-white`}>
          {pending ? "Confirming…" : "Confirm booking"}
        </button>
        {state.message && !state.next ? (
          <p role="alert" className="text-[15px] text-danger">
            {state.message}
          </p>
        ) : null}
        {state.next === "signin" ? (
          <p role="alert" className="text-[15px] text-danger">
            {state.message}
          </p>
        ) : null}
      </form>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut().then(() => router.refresh())}
        className="min-h-11 self-start text-[15px] font-semibold text-muted underline"
      >
        Not you? Use a different account
      </button>
    </section>
  );
}
