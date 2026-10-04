"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "../lib/supabase/client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Rectangular buttons and fields of originals 16 and 18 (not pills). */
export const button =
  "press flex h-[42px] w-full items-center justify-center gap-2.5 rounded-[10px] text-[15px] font-semibold disabled:opacity-40";
export const outline = `${button} border border-line-strong bg-white font-medium`;
export const primary = `${button} bg-ink text-white`;
export const input =
  "h-10 w-full rounded-[8px] border border-line-strong bg-white px-4 text-[16px] outline-none placeholder:text-muted focus:border-2 focus:border-select";
export const fieldLabel = "text-[13px] font-semibold text-muted";
export const heading = "text-[19px] leading-6 font-semibold";
export const lead = "mt-1.5 text-[14px] leading-5 font-medium text-muted";

export function useNow(intervalMs = 1000) {
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

export function SignIn({
  title,
  lead: leadText,
  footnote,
  signInFailed,
}: {
  title: string;
  lead: string;
  footnote?: string;
  signInFailed: boolean;
}) {
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
        {title}
      </h1>
      <p className={lead}>{leadText}</p>
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
      {footnote ? (
        <p className="mt-10 text-center text-[13px] leading-[18px] text-muted">{footnote}</p>
      ) : null}
    </section>
  );
}
