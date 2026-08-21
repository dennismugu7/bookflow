/**
 * The public API's shapes, as this app uses them.
 *
 * ══ HAND-WRITTEN, AND THAT IS A DEVIATION WORTH NAMING ══════════════════════
 *
 * `CLAUDE.md` §9 prohibits hand-written **Dart** request/response models,
 * because ADR-014 generates a Dart client from the spec and a hand-written model
 * would be a second source of truth for the same wire format.
 *
 * **There is no generated TypeScript client**, and adding one would mean a
 * second generator, a second drift check, and a second committed artifact — for
 * three endpoints with twelve fields between them. The spec IS generated from
 * `apps/api`'s Zod schemas, so the contract is still single-sourced; what is
 * duplicated here is a description of it.
 *
 * The exposure that creates: a field renamed in the API compiles fine here and
 * arrives `undefined` at runtime. That is bounded because this file is small,
 * it is the only place in the app that names a wire field, and every one of
 * those fields is rendered somewhere a person would notice its absence.
 *
 * **If this file grows past the public surface, generate it instead.**
 */

/** `PublicService` in the spec. Money is whole KES — never a float. */
export interface Service {
  readonly id: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceKes: number;
}

/** `PublicTeamMember`. Everything but the id and name may be absent. */
export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly about: string | null;
  readonly photoUrl: string | null;
}

/**
 * `PublicOpeningHours`. **`dayOfWeek` is 0 = MONDAY**, which is not
 * JavaScript's convention and is the single most likely thing to get wrong here.
 *
 * `Date.getDay()` is 0 = Sunday. Every conversion between the two lives in
 * `lib/salonTime.ts` and nowhere else.
 *
 * A day the salon is closed has NO ROW — absence is the closed state, so the
 * weekly list has to iterate seven days and look each one up rather than mapping
 * over what arrives.
 */
export interface OpeningHours {
  readonly dayOfWeek: number;
  readonly openTime: string;
  readonly closeTime: string;
}

/** `PublicSalon` — the ADR-020 allowlist projection, whole. */
export interface Salon {
  readonly handle: string;
  readonly name: string;
  readonly tagline: string | null;
  readonly about: string | null;
  readonly category: string | null;
  readonly bannerUrl: string | null;
  readonly address: string | null;
  readonly mapsUrl: string | null;
  readonly services: readonly Service[];
  readonly teamMembers: readonly TeamMember[];
  readonly openingHours: readonly OpeningHours[];
  readonly portfolioImageUrls: readonly string[];
}

/** `Availability`. `HH:MM` local to the salon; empty means nothing is free. */
export interface Availability {
  readonly slots: readonly string[];
}

/** `BookingReceipt` — what a client gets back after booking. */
export interface BookingReceipt {
  readonly id: string;
  readonly serviceName: string;
  readonly durationMinutes: number;
  readonly priceKes: number;
  readonly startsAt: string;
  readonly status: string;
}
