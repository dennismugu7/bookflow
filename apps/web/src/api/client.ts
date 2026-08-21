import type { Availability, BookingReceipt, Salon } from './types';

/**
 * The one place this app talks to the API.
 *
 * ── THE BASE URL IS BUILD-TIME, WITH A COMMITTED DEFAULT ───────────────────
 *
 * `VITE_API_BASE_URL` is substituted by Vite at build time — there is no
 * runtime config file to fetch, because this is a static site and one more
 * request before the first paint would be a request on every cold load.
 *
 * The default is staging's URL and is committed deliberately: a build with no
 * environment set produces a working site rather than one that fails on every
 * request with an unhelpful relative-URL 404. **It is not a secret** — this
 * origin is in every browser's network tab the moment anyone opens a salon page.
 */
// `src/vite-env.d.ts` declares this variable, which is what makes it a
// `string | undefined` rather than the `any` Vite's index signature hands back.
// A trailing slash is stripped so every path below can start with one.
const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ??
  // The `-gabm` is Render's — it appends a suffix when a service name is not
  // globally unique, and the deployed origin carries it. Copied from
  // docs/ENVIRONMENT.md rather than derived from the blueprint's `name`, which
  // would be a guess that looks right and 404s.
  'https://bookflow-api-staging-gabm.onrender.com'
).replace(/\/+$/, '');

/**
 * A request that failed in a way the UI can act on.
 *
 * ── THE SLUG, NEVER THE STATUS CODE ────────────────────────────────────────
 *
 * ADR-014 makes the problem document's `type` "a stable, machine-readable slug
 * and part of the contract". The API has several distinct 409s; a screen keyed
 * on `409` would confidently show the wrong sentence. So the slug travels and
 * the status does not.
 */
export class ApiError extends Error {
  readonly status: number;
  /** The problem `type` with `/problems/` stripped, or `undefined`. */
  readonly slug: string | undefined;

  constructor(status: number, slug: string | undefined, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.slug = slug;
  }

  /** The salon is not published, or the handle is not a salon at all. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** Somebody took the slot between the availability read and the booking. */
  get isSlotTaken(): boolean {
    return this.slug === 'slot-taken';
  }
}

/**
 * Reads a problem document's slug without trusting that there is one.
 *
 * A gateway 502 is HTML, a dropped connection has no body at all, and a
 * truncated response has no `type`. Every one of those yields `undefined`, and
 * the caller falls back to a generic message rather than throwing while
 * building an error.
 */
async function slugOf(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return undefined;
    const type = (body as { type?: unknown }).type;
    if (typeof type !== 'string') return undefined;
    return type.replace(/^\/problems\//, '');
  } catch {
    return undefined;
  }
}

async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { accept: 'application/json' },
    });
  } catch (cause) {
    // A network failure, a CORS refusal, or a DNS miss all land here as the
    // same opaque TypeError. Named as a connection problem because that is the
    // only thing a visitor can act on.
    throw new ApiError(
      0,
      undefined,
      `could not reach the server: ${String(cause)}`,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      await slugOf(response),
      `request failed with ${String(response.status)}`,
    );
  }

  return (await response.json()) as T;
}

export async function fetchSalon(handle: string): Promise<Salon> {
  return await get<Salon>(`/v1/public/salons/${encodeURIComponent(handle)}`);
}

/**
 * The bookable start times for one service on one day.
 *
 * ── `teamMemberId` IS OMITTED, NOT SENT EMPTY, FOR "ANY PROFESSIONAL" ──────
 *
 * The API treats an absent team member as "is the SALON free", which is a
 * different question from "is this person free" and matches how the exclusion
 * constraint stores such a booking. Sending an empty string would be a
 * validation failure, and sending a sentinel would book the wrong thing.
 */
export async function fetchAvailability(
  handle: string,
  input: {
    readonly serviceId: string;
    readonly date: string;
    readonly teamMemberId?: string | undefined;
  },
): Promise<Availability> {
  const query = new URLSearchParams({
    serviceId: input.serviceId,
    date: input.date,
  });
  if (input.teamMemberId !== undefined) {
    query.set('teamMemberId', input.teamMemberId);
  }

  return await get<Availability>(
    `/v1/public/salons/${encodeURIComponent(handle)}/availability?${query.toString()}`,
  );
}

/**
 * Makes the booking.
 *
 * **multipart, because the payment proof is a file** — and the whole body goes
 * as `FormData` rather than the proof going separately, so a booking and its
 * proof cannot half-succeed.
 *
 * `content-type` is deliberately NOT set: the browser has to add its own
 * `multipart/form-data` header with the boundary token it generated, and a
 * hand-set header overwrites it with one that has no boundary. The request then
 * fails to parse server-side, which reads as a malformed-booking bug.
 */
export async function createBooking(
  handle: string,
  input: {
    readonly serviceId: string;
    readonly startsAt: string;
    readonly clientName: string;
    readonly clientEmail: string;
    readonly clientPhone: string;
    readonly teamMemberId?: string | undefined;
    readonly paymentProof?: File | undefined;
  },
): Promise<BookingReceipt> {
  const form = new FormData();
  form.set('serviceId', input.serviceId);
  form.set('startsAt', input.startsAt);
  form.set('clientName', input.clientName);
  form.set('clientEmail', input.clientEmail);
  form.set('clientPhone', input.clientPhone);
  if (input.teamMemberId !== undefined) {
    form.set('teamMemberId', input.teamMemberId);
  }
  if (input.paymentProof !== undefined) {
    form.set('paymentProof', input.paymentProof);
  }

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/v1/public/salons/${encodeURIComponent(handle)}/bookings`,
      { method: 'POST', body: form },
    );
  } catch (cause) {
    throw new ApiError(
      0,
      undefined,
      `could not reach the server: ${String(cause)}`,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      await slugOf(response),
      `booking failed with ${String(response.status)}`,
    );
  }

  return (await response.json()) as BookingReceipt;
}
