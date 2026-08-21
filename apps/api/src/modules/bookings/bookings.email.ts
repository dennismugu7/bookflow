import type { Mail } from '../../platform/resend.ts';
import { SALON_TIME_ZONE } from './bookings.schema.ts';

/**
 * What the client is told when a booking changes.
 *
 * ══ PLAIN TEXT, NOT HTML ════════════════════════════════════════════════════
 *
 * The design draws styled templates. These are text, and that is a deliberate
 * v1 position rather than an oversight: an HTML mail needs inlined CSS, a table
 * layout, a text fallback and testing across clients that render none of it the
 * same way — and every one of those is a place for a client's name to end up
 * inside a tag. Text carries the same five facts, arrives everywhere, and
 * cannot be broken by a mail client.
 *
 * **Recorded as a deviation from the design, not as the design.**
 *
 * ── NOTHING HERE IS INTERPOLATED INTO MARKUP ───────────────────────────────
 *
 * `clientName` and `salonName` are attacker-influenced in the sense that
 * anybody can book with any name. In text there is nothing to escape, which is
 * the second reason for text: an HTML version would need escaping and would get
 * it wrong exactly once.
 */

export interface BookingMailFacts {
  readonly clientName: string;
  readonly clientEmail: string;
  readonly salonName: string;
  readonly serviceName: string;
  /** The instant, as stored. Rendered in the salon's zone below. */
  readonly startsAt: Date;
}

/**
 * `Friday, 22 August 2026` and `14:30`, in Africa/Nairobi.
 *
 * ── THE ZONE IS NAMED, NOT INHERITED ───────────────────────────────────────
 *
 * `Intl.DateTimeFormat` with an explicit `timeZone` rather than
 * `toLocaleString` with the default: the default is the SERVER's zone, so a
 * container running UTC would tell a Nairobi client their 14:30 appointment is
 * at 11:30. ADR-005 makes the zone an application constant and this is one of
 * the two places it is applied (the other is the availability query, in SQL).
 */
function formatWhen(startsAt: Date): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(startsAt);

  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(startsAt);

  return { date, time };
}

/** The design's "Great news!" template. */
export function confirmedMail(facts: BookingMailFacts): Mail {
  const { date, time } = formatWhen(facts.startsAt);

  return {
    to: facts.clientEmail,
    subject: `Your booking with ${facts.salonName} is confirmed`,
    text:
      `Great news, ${facts.clientName}!\n\n` +
      `${facts.salonName} has confirmed your booking.\n\n` +
      `  ${facts.serviceName}\n` +
      `  ${date}\n` +
      `  ${time}\n\n` +
      `We look forward to seeing you.\n\n` +
      `${facts.salonName}\n`,
  };
}

/** The design's "We're sorry" template. */
export function cancelledMail(facts: BookingMailFacts): Mail {
  const { date, time } = formatWhen(facts.startsAt);

  return {
    to: facts.clientEmail,
    subject: `Your booking with ${facts.salonName} has been cancelled`,
    text:
      `We're sorry, ${facts.clientName}.\n\n` +
      `${facts.salonName} has had to cancel your booking.\n\n` +
      `  ${facts.serviceName}\n` +
      `  ${date}\n` +
      `  ${time}\n\n` +
      `You are welcome to book another time whenever suits you.\n\n` +
      `${facts.salonName}\n`,
  };
}

/**
 * Reinstatement, mirroring the confirmed tone.
 *
 * The design has no template for this — it has no reinstate flow at all — so
 * the copy is written to match "Great news!" rather than invented in a
 * different register. A client who received the cancellation an hour ago needs
 * the reversal to read as unambiguously good news and to repeat the details,
 * because the last mail they have from this salon says the appointment is off.
 */
export function reinstatedMail(facts: BookingMailFacts): Mail {
  const { date, time } = formatWhen(facts.startsAt);

  return {
    to: facts.clientEmail,
    subject: `Your booking with ${facts.salonName} is back on`,
    text:
      `Good news, ${facts.clientName} — your booking with ${facts.salonName} ` +
      `is back on.\n\n` +
      `  ${facts.serviceName}\n` +
      `  ${date}\n` +
      `  ${time}\n\n` +
      `Please ignore the cancellation notice you may have received.\n\n` +
      `${facts.salonName}\n`,
  };
}
