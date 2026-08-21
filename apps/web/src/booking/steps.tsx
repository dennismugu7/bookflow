import { useEffect, useState } from 'react';

import { fetchAvailability } from '../api/client';
import type { Service, TeamMember } from '../api/types';
import { formatDuration, formatKes } from '../lib/format';
import {
  addDays,
  addMinutes,
  describeDate,
  formatLongDate,
  salonNow,
} from '../lib/salonTime';
import { Avatar, Spinner } from '../ui/common';

/**
 * Step 1 — select a service.
 *
 * ══ SINGLE-SELECT, DESPITE THE "+" ══════════════════════════════════════════
 *
 * The spec is emphatic and explains why it flags it: "the '+' icon is a common
 * multi-select affordance and could easily be miscoded as such — the UI visually
 * suggests 'add multiple,' but the actual behavior is exclusive/single-select."
 *
 * So selecting a card replaces the selection rather than adding to it. The
 * control still swaps +↔✓ as drawn.
 *
 * The API enforces the same thing from the other side: a booking has ONE
 * `service_id` and one snapshot (ADR-006), so a second service would be a second
 * booking and a second slot.
 */
export function SelectServices({
  services,
  selected,
  onSelect,
}: {
  readonly services: readonly Service[];
  readonly selected: Service | null;
  readonly onSelect: (service: Service) => void;
}): React.ReactElement {
  return (
    <div className="pad">
      {services.map((service) => {
        const isOn = selected?.id === service.id;
        return (
          <button
            key={service.id}
            type="button"
            className={isOn ? 'card card--selected service' : 'card service'}
            style={{ width: '100%', textAlign: 'left' }}
            aria-pressed={isOn}
            onClick={() => onSelect(service)}
          >
            <span className="service__body">
              <span className="service__name" style={{ display: 'block' }}>
                {service.name}
              </span>
              <span className="service__meta" style={{ display: 'block' }}>
                {formatDuration(service.durationMinutes)}
              </span>
              <span className="price">{formatKes(service.priceKes)}</span>
            </span>
            <span
              className={isOn ? 'pick pick--on' : 'pick'}
              aria-hidden="true"
            >
              {isOn ? '✓' : '+'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The sentinel the flow uses for "no particular person". */
export const ANY_PROFESSIONAL = 'any';

/**
 * Step 2 — select a professional. Only reached when the salon has a team.
 *
 * "Any professional" is pinned first and is not a team member: choosing it
 * sends NO `teamMemberId`, which asks the API whether the SALON is free rather
 * than whether one person is. That is a different question and the wider one,
 * which is what "Maximum availability" means.
 */
export function SelectProfessional({
  team,
  selectedId,
  onSelect,
}: {
  readonly team: readonly TeamMember[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}): React.ReactElement {
  return (
    <div className="pad">
      <button
        type="button"
        className={
          selectedId === ANY_PROFESSIONAL
            ? 'card card--selected service'
            : 'card service'
        }
        style={{ width: '100%', textAlign: 'left' }}
        aria-pressed={selectedId === ANY_PROFESSIONAL}
        onClick={() => onSelect(ANY_PROFESSIONAL)}
      >
        <span
          className="avatar avatar--initials"
          style={{ width: 48, height: 48, flex: '0 0 auto' }}
          aria-hidden="true"
        >
          ⇄
        </span>
        <span className="service__body">
          <span className="service__name" style={{ display: 'block' }}>
            Any professional
          </span>
          <span className="service__meta" style={{ display: 'block' }}>
            Maximum availability
          </span>
        </span>
        <span
          className={selectedId === ANY_PROFESSIONAL ? 'pick pick--on' : 'pick'}
          aria-hidden="true"
        >
          {selectedId === ANY_PROFESSIONAL ? '✓' : '+'}
        </span>
      </button>

      {team.map((member) => {
        const isOn = selectedId === member.id;
        return (
          <button
            key={member.id}
            type="button"
            className={isOn ? 'card card--selected service' : 'card service'}
            style={{ width: '100%', textAlign: 'left' }}
            aria-pressed={isOn}
            onClick={() => onSelect(member.id)}
          >
            <span style={{ width: 48, flex: '0 0 auto' }}>
              <Avatar name={member.name} photoUrl={member.photoUrl} />
            </span>
            <span className="service__body">
              <span className="service__name" style={{ display: 'block' }}>
                {member.name}
              </span>
              {member.role !== null && member.role !== '' && (
                <span className="service__meta" style={{ display: 'block' }}>
                  {member.role}
                </span>
              )}
            </span>
            <span
              className={isOn ? 'pick pick--on' : 'pick'}
              aria-hidden="true"
            >
              {isOn ? '✓' : '+'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The next fortnight, as salon-local calendar dates. */
function upcomingDates(): readonly string[] {
  const today = salonNow().date;
  return Array.from({ length: 14 }, (_unused, offset) =>
    addDays(today, offset),
  );
}

/**
 * Step 3 — date and time.
 *
 * ══ AVAILABILITY IS REFETCHED ON EVERY CHANGE OF DATE *OR* PROFESSIONAL ═════
 *
 * They are one question: "what is free for this service, on this day, with this
 * person". Caching across a professional change would offer a slot that belongs
 * to somebody else's diary — the API would then refuse the booking with 409
 * `slot-taken`, which is correct and is a terrible way to find out.
 *
 * The previously-selected time is cleared whenever the answer is refetched, for
 * the same reason: a slot that was free at 10:00 for Grace may not be free for
 * Wanjiku, and keeping the selection would carry an invalid one into review.
 */
export function SelectDateTime({
  handle,
  service,
  teamMemberId,
  date,
  slot,
  onPickDate,
  onPickSlot,
  notice,
}: {
  readonly handle: string;
  readonly service: Service;
  readonly teamMemberId: string | undefined;
  readonly date: string;
  readonly slot: string | null;
  readonly onPickDate: (date: string) => void;
  readonly onPickSlot: (slot: string | null) => void;
  readonly notice: string | null;
}): React.ReactElement {
  const [slots, setSlots] = useState<readonly string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const dates = upcomingDates();

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setFailed(false);

    fetchAvailability(handle, {
      serviceId: service.id,
      date,
      teamMemberId,
    })
      .then((availability) => {
        if (!cancelled) setSlots(availability.slots);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setSlots([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handle, service.id, date, teamMemberId]);

  return (
    <div className="pad">
      {notice !== null && (
        <p className="error-text" role="alert">
          {notice}
        </p>
      )}

      <h3 className="section-title">Select a date</h3>
      <div className="date-strip">
        {dates.map((candidate) => {
          const described = describeDate(candidate);
          const isOn = candidate === date;
          return (
            <button
              key={candidate}
              type="button"
              className={isOn ? 'date-card date-card--selected' : 'date-card'}
              aria-pressed={isOn}
              onClick={() => {
                onPickDate(candidate);
                onPickSlot(null);
              }}
            >
              <div className="date-card__weekday">{described.weekdayShort}</div>
              <div className="date-card__day">{described.day}</div>
              <div className="date-card__month">{described.monthShort}</div>
            </button>
          );
        })}
      </div>

      <h3 className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
        Pick a time
      </h3>

      {slots === null && <Spinner />}

      {slots !== null && failed && (
        <p className="error-text">
          We couldn&apos;t load times for that day. Check your connection and
          pick a date again.
        </p>
      )}

      {slots !== null && !failed && slots.length === 0 && (
        <p className="muted">No free slots this day.</p>
      )}

      {slots !== null &&
        slots.map((candidate) => {
          const isOn = candidate === slot;
          return (
            <button
              key={candidate}
              type="button"
              className={isOn ? 'slot-row slot-row--selected' : 'slot-row'}
              aria-pressed={isOn}
              onClick={() => onPickSlot(candidate)}
            >
              <span className="slot-row__time">{candidate}</span>
              {/*
                The price on every row, which the spec draws. It is the SERVICE's
                price — the spec flags a mockup showing a different currency here
                and asks for one source; this is that source. Nothing in the data
                model varies price by slot or by person.
              */}
              <span className="price">{formatKes(service.priceKes)}</span>
            </button>
          );
        })}
    </div>
  );
}

/** Step 4 — the review card. Everything on it is computed, nothing refetched. */
export function ReviewBooking({
  service,
  professional,
  date,
  slot,
}: {
  readonly service: Service;
  readonly professional: TeamMember | null;
  readonly date: string;
  readonly slot: string;
}): React.ReactElement {
  // Start + duration. The spec calls this out as something "the developer will
  // need to calculate rather than just display the raw start time".
  const endsAt = addMinutes(slot, service.durationMinutes);

  return (
    <div className="pad">
      <div className="card stack">
        <div className="review-line">
          <span aria-hidden="true">📅</span>
          <span style={{ flex: 1 }}>{formatLongDate(date)}</span>
        </div>
        <div className="review-line">
          <span aria-hidden="true">🕘</span>
          <span style={{ flex: 1 }}>
            {slot}–{endsAt} ({formatDuration(service.durationMinutes)})
          </span>
        </div>

        <hr className="divider" style={{ margin: 'var(--space-md) 0' }} />

        <div className="review-line">
          <span style={{ fontWeight: 700 }}>{service.name}</span>
          <span className="price">{formatKes(service.priceKes)}</span>
        </div>
        <p className="service__meta" style={{ margin: 0 }}>
          {formatDuration(service.durationMinutes)}
          {/*
            The spec spots an orphaned "·" here and guesses the professional's
            name was meant to follow it. It is added — but only when one was
            actually chosen, since "Any professional" is the absence of a choice
            rather than a person to name.
          */}
          {professional !== null && ` · ${professional.name}`}
        </p>

        <hr className="divider" style={{ margin: 'var(--space-md) 0' }} />

        <div className="review-line">
          <span className="review-total">Total</span>
          {/*
            Summed rather than copied from the single line item. There is one
            service today; the spec asks for a computed sum so that stays true
            if that ever changes.
          */}
          <span className="review-total price">
            {formatKes([service].reduce((sum, item) => sum + item.priceKes, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
