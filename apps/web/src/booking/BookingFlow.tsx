import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ApiError, createBooking } from '../api/client';
import type { Service, TeamMember } from '../api/types';
import { formatDuration, formatKes } from '../lib/format';
import { salonNow, toInstant } from '../lib/salonTime';
import {
  nextStep,
  previousStep,
  STEP_TITLES,
  stepsFor,
  type Step,
} from '../lib/steps';
import { useSalon, useSalonTitle } from '../salon/useSalon';
import { Notice, Spinner } from '../ui/common';
import { BookingMade, ConfirmStep } from './ConfirmStep';
import {
  ANY_PROFESSIONAL,
  ReviewBooking,
  SelectDateTime,
  SelectProfessional,
  SelectServices,
} from './steps';

/**
 * `/:handle/book` — the whole booking flow, as one route.
 *
 * ══ ONE ROUTE, STEP IN STATE ════════════════════════════════════════════════
 *
 * The spec suggests deep-linkable per-step routes. This is one route with the
 * step in component state, deliberately: **the steps are not independently
 * addressable**. `/book/datetime` reached cold would have no selected service,
 * no professional, and nothing to fetch availability for — so it would have to
 * redirect to step one, which makes it a link that never works.
 *
 * What the browser Back button does instead is leave the flow, which is the same
 * thing the X does and is what a visitor means by "back" from a page they
 * arrived at whole.
 */
export function BookingFlow(): React.ReactElement {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = useSalon(handle);

  useSalonTitle(state.status === 'ready' ? state.salon : undefined);

  // The service tapped on the salon page, if the visitor came in that way.
  const preselectedId = (location.state as { serviceId?: string } | null)
    ?.serviceId;

  const [step, setStep] = useState<Step>('services');
  const [serviceId, setServiceId] = useState<string | null>(
    preselectedId ?? null,
  );
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => salonNow().date);
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const salon = state.status === 'ready' ? state.salon : null;

  const steps = useMemo(
    () => stepsFor((salon?.teamMembers.length ?? 0) > 0),
    [salon],
  );

  const service: Service | null =
    salon?.services.find((candidate) => candidate.id === serviceId) ?? null;

  const professional: TeamMember | null =
    professionalId === null || professionalId === ANY_PROFESSIONAL
      ? null
      : (salon?.teamMembers.find((member) => member.id === professionalId) ??
        null);

  if (state.status === 'loading') {
    return (
      <div className="shell shell--flow">
        <Spinner />
      </div>
    );
  }

  if (state.status !== 'ready' || salon === null) {
    return (
      <Notice
        title="Not available"
        body="This salon isn't taking bookings yet."
      />
    );
  }

  const exit = (): void => {
    void navigate(`/${salon.handle}`);
  };

  const goBack = (): void => {
    const target = previousStep(steps, step);
    // Null means "the first step", where back leaves the flow entirely. The
    // step array already omits `professional` when it was skipped, so nothing
    // here has to remember that it was.
    if (target === null) exit();
    else setStep(target);
  };

  /** Whether the current step has what it needs to advance. */
  const canContinue = ((): boolean => {
    switch (step) {
      case 'services':
        return service !== null;
      case 'professional':
        return professionalId !== null;
      case 'datetime':
        return slot !== null;
      case 'review':
        return true;
      case 'confirm':
        return false;
    }
  })();

  const submit = (details: {
    readonly name: string;
    readonly phone: string;
    readonly email: string;
    readonly proof: File | undefined;
  }): void => {
    if (service === null || slot === null) return;

    setSubmitting(true);
    setError(null);

    createBooking(salon.handle, {
      serviceId: service.id,
      // The salon's wall clock, with an explicit +03:00. Never `new Date(...)`
      // built from local parts — that would mean the visitor's zone.
      startsAt: toInstant(date, slot),
      clientName: details.name,
      clientEmail: details.email,
      clientPhone: details.phone,
      // Omitted for "Any professional", which is a different question rather
      // than a missing answer. See `SelectProfessional`.
      teamMemberId:
        professionalId === null || professionalId === ANY_PROFESSIONAL
          ? undefined
          : professionalId,
      paymentProof: details.proof,
    })
      .then(() => {
        setDone(true);
      })
      .catch((cause: unknown) => {
        // ── THE ONE FAILURE WITH SOMEWHERE TO GO ──────────────────────────
        //
        // A 409 `slot-taken` means the slot went between reading availability
        // and submitting — the race the database exclusion constraint exists
        // for. It is not a fault and there is nothing to retry: the visitor
        // needs a different time, so the flow walks back to the step that
        // picks one and says why.
        if (cause instanceof ApiError && cause.isSlotTaken) {
          setSlot(null);
          setSlotNotice('That time was just taken — pick another.');
          setStep('datetime');
          return;
        }
        setError(
          'That did not go through. Check your connection and try again.',
        );
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  if (done) {
    return (
      <div className="shell shell--flow">
        <BookingMade salonName={salon.name} />
      </div>
    );
  }

  return (
    <div className="shell shell--flow">
      <div className="flow-bar">
        <button type="button" onClick={goBack} aria-label="Back">
          ‹
        </button>
        {/*
          The X is dropped on the final step, per the spec: it is the flow's
          endpoint rather than a step to abandon, and the form there holds
          typed details a stray tap should not discard.
        */}
        {step !== 'confirm' && (
          <button type="button" onClick={exit} aria-label="Close">
            ×
          </button>
        )}
      </div>

      {step !== 'confirm' && (
        <h1
          className="page-title pad"
          style={{ marginBottom: 'var(--space-lg)' }}
        >
          {STEP_TITLES[step]}
        </h1>
      )}

      {step === 'services' && (
        <SelectServices
          services={salon.services}
          selected={service}
          onSelect={(picked) => {
            setServiceId(picked.id);
            // A different service has a different duration, so the slot that
            // was free may no longer fit before closing. Cleared rather than
            // carried into a step that would offer it.
            setSlot(null);
          }}
        />
      )}

      {step === 'professional' && (
        <SelectProfessional
          team={salon.teamMembers}
          selectedId={professionalId}
          onSelect={(picked) => {
            setProfessionalId(picked);
            setSlot(null);
          }}
        />
      )}

      {step === 'datetime' && service !== null && (
        <SelectDateTime
          handle={salon.handle}
          service={service}
          teamMemberId={
            professionalId === null || professionalId === ANY_PROFESSIONAL
              ? undefined
              : professionalId
          }
          date={date}
          slot={slot}
          onPickDate={setDate}
          onPickSlot={(picked) => {
            setSlot(picked);
            setSlotNotice(null);
          }}
          notice={slotNotice}
        />
      )}

      {step === 'review' && service !== null && slot !== null && (
        <ReviewBooking
          service={service}
          professional={professional}
          date={date}
          slot={slot}
        />
      )}

      {step === 'confirm' && (
        <ConfirmStep
          salonName={salon.name}
          submitting={submitting}
          error={error}
          onSubmit={submit}
        />
      )}

      {/*
        The summary bar, on every step but the last. The spec confirms it is
        "scoped to the overall booking summary across the whole flow, not
        step-specific content" — it shows the service throughout and does not
        change when a professional is picked.

        It appears only once there is something to summarise, which is the
        conditional render the spec describes on step one.
      */}
      {step !== 'confirm' && service !== null && (
        <div className="sticky-footer">
          <div className="sticky-footer__text" style={{ fontStyle: 'normal' }}>
            <div className="summary-bar__from">
              <span className="muted">from </span>
              <span className="price">{formatKes(service.priceKes)}</span>
            </div>
            <div className="summary-bar__meta">
              1 item · {formatDuration(service.durationMinutes)}
            </div>
          </div>
          <button
            type="button"
            className="btn btn--solid"
            disabled={!canContinue}
            onClick={() => setStep(nextStep(steps, step))}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
