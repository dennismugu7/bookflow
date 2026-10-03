"use client";

import Script from "next/script";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      appearance?: "always" | "execute" | "interaction-only";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = {
  /** The current token, waiting up to 30 s for the check to finish; null if it fails. */
  getToken: () => Promise<string | null>;
  /** Tokens are single-use: call after each hold attempt. */
  reset: () => void;
};

/**
 * Cloudflare Turnstile in "interaction-only" mode: invisible unless Cloudflare needs the visitor
 * to tick a box. Loaded from challenges.cloudflare.com, no npm package.
 */
export function Turnstile({ siteKey, ref }: { siteKey: string; ref: Ref<TurnstileHandle> }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiters = useRef<((value: string | null) => void)[]>([]);
  // True straight away when the script is already loaded (e.g. coming back to this page).
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && !!window.turnstile,
  );

  const settle = useCallback((value: string | null) => {
    token.current = value;
    const pending = waiters.current;
    waiters.current = [];
    for (const resolve of pending) resolve(value);
  }, []);

  useEffect(() => {
    if (!scriptReady || !window.turnstile || !container.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      appearance: "interaction-only",
      callback: (value) => settle(value),
      "expired-callback": () => {
        token.current = null;
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
      "error-callback": () => settle(null),
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [scriptReady, siteKey, settle]);

  useImperativeHandle(ref, () => ({
    getToken: () => {
      if (token.current) return Promise.resolve(token.current);
      return new Promise((resolve) => {
        waiters.current.push(resolve);
        setTimeout(() => resolve(token.current), 30_000);
      });
    },
    reset: () => {
      token.current = null;
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    },
  }));

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={container} />
    </>
  );
}
