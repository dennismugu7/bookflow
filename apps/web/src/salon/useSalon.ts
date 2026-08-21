import { useEffect, useState } from 'react';

import { ApiError, fetchSalon } from '../api/client';
import type { Salon } from '../api/types';

export type SalonState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly salon: Salon }
  /** The handle is unknown, or the salon is not published (ADR-004). */
  | { readonly status: 'missing' }
  | { readonly status: 'failed' };

/**
 * Loads a salon by handle.
 *
 * ══ "NOT FOUND" IS A VIEW, NOT AN ERROR ═════════════════════════════════════
 *
 * A 404 here means one of two things and the visitor cannot tell them apart:
 * the handle is wrong, or the salon has not published yet. **Both are ordinary**
 * — an owner shares their link before going live more often than anyone would
 * like — so it resolves to `missing`, which renders "This salon isn't taking
 * bookings yet", not to `failed`, which offers a retry that cannot help.
 *
 * Every other failure is `failed`, including a network drop, where retrying is
 * exactly the right suggestion.
 *
 * ── THE ABORT GUARD IS NOT CEREMONY ────────────────────────────────────────
 *
 * React 19's StrictMode runs effects twice in development, and the flow route
 * mounts this alongside the salon page. Without the cancellation flag, a
 * resolved fetch from an unmounted render calls `setState` and React warns —
 * and worse, a slow first request can land after a fast second one and show the
 * previous salon.
 */
export function useSalon(handle: string | undefined): SalonState {
  const [state, setState] = useState<SalonState>({ status: 'loading' });

  useEffect(() => {
    if (handle === undefined || handle === '') {
      setState({ status: 'missing' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetchSalon(handle)
      .then((salon) => {
        if (!cancelled) setState({ status: 'ready', salon });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const missing = error instanceof ApiError && error.isNotFound;
        setState({ status: missing ? 'missing' : 'failed' });
      });

    return () => {
      cancelled = true;
    };
  }, [handle]);

  return state;
}

/**
 * Sets the document title to the salon's name.
 *
 * The static `index.html` cannot name a salon — one build serves every handle —
 * so the title is corrected once the fetch resolves. It matters more here than
 * on most pages: this link gets shared, and a browser tab or a bookmark reading
 * "Book an appointment · Bookflow" for six different salons is useless.
 */
export function useSalonTitle(salon: Salon | undefined): void {
  useEffect(() => {
    if (salon === undefined) return;
    const previous = document.title;
    document.title = `${salon.name} · Book an appointment`;
    return () => {
      document.title = previous;
    };
  }, [salon]);
}
