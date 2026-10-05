import { callbackErrorDescription, GOOGLE_ERROR, readGoogleResult } from "./google-auth";

export type GoogleCallbackState = {
  /** A code from Google is being exchanged for a session: hold the screens until it's done. */
  pending: boolean;
  /** Shown on Sign in when the callback failed, so the app never lands silently on Welcome. */
  error: string | undefined;
};

type Exchange = (code: string) => Promise<{ error: unknown }>;

/**
 * Completes Supabase's bookflow://auth/callback (release 1.0.0). The link can reach the app twice:
 * through openAuthSessionAsync and through Linking, or only through Linking.getInitialURL() when
 * Android killed the app while the user was in Chrome. Each code is exchanged once.
 */
export function createGoogleCallback(exchange: Exchange) {
  const started = new Map<string, Promise<"signed-in" | "error">>();
  const listeners = new Set<() => void>();
  let state: GoogleCallbackState = { pending: false, error: undefined };
  let running = 0;

  function set(next: Partial<GoogleCallbackState>) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  }

  async function run(url: string): Promise<"signed-in" | "error"> {
    const result = readGoogleResult({ type: "success", url });
    if (result.kind !== "code") {
      console.warn("Google sign-in returned an error:", callbackErrorDescription(url) ?? "no code");
      set({ error: GOOGLE_ERROR });
      return "error";
    }
    running += 1;
    set({ pending: true, error: undefined });
    try {
      const { error } = await exchange(result.code);
      if (error) {
        console.warn("Google sign-in: the code exchange failed:", String(error));
        set({ error: GOOGLE_ERROR });
        return "error";
      }
      return "signed-in";
    } catch (caught) {
      console.warn("Google sign-in: the code exchange threw:", String(caught));
      set({ error: GOOGLE_ERROR });
      return "error";
    } finally {
      running -= 1;
      set({ pending: running > 0 });
    }
  }

  return {
    complete(url: string): Promise<"signed-in" | "error"> {
      // The same link twice (or a second copy of it) shares the first exchange.
      let done = started.get(url);
      if (!done) {
        done = run(url);
        started.set(url, done);
      }
      return done;
    },
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** The error once, for the screen that shows it. */
    takeError(): string | undefined {
      const { error } = state;
      if (error) set({ error: undefined });
      return error;
    },
  };
}
