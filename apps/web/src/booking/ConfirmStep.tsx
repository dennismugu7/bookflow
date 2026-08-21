import { useRef, useState } from 'react';

/**
 * Step 5 — deposit instructions, proof upload, and contact details.
 *
 * ══ THE DEPOSIT COPY IS GENERIC, AND THAT IS FORCED ═════════════════════════
 *
 * The spec's screen says "Just drop a KES 500 deposit" and then flags its own
 * gap twice: the amount "should be a dynamic value ... rather than hardcoded —
 * flag this as needing a data source", and separately, "no M-Pesa
 * number/payment channel is shown for the KES 500 deposit — needs clarification
 * on where/how the client actually sends the deposit."
 *
 * **Neither exists in the data model.** There is no deposit column and no till
 * number anywhere in the schema. So the copy names neither: inventing an amount
 * would be a number the salon never agreed to, and inventing a paybill would be
 * a stranger's till.
 *
 * What it does say is true and actionable — pay by M-Pesa, upload the
 * confirmation — and the salon can tell the client where in the confirmation
 * email. Closing this properly needs two owner-app fields and is a separate
 * slice.
 *
 * ── THE PROOF IS OPTIONAL, WHICH THE SPEC LEAVES OPEN ──────────────────────
 *
 * It recommends "making the form's submit action conditionally validate that a
 * file has been attached", and asks for confirmation. It is optional here: a
 * client who books at midnight and pays in the morning would otherwise be
 * unable to book at all, and the API already treats the proof as optional — the
 * booking succeeds and simply carries no proof. The owner sees
 * `hasPaymentProof: false` and can chase it.
 */
export function ConfirmStep({
  salonName,
  submitting,
  error,
  onSubmit,
}: {
  readonly salonName: string;
  readonly submitting: boolean;
  readonly error: string | null;
  readonly onSubmit: (details: {
    readonly name: string;
    readonly phone: string;
    readonly email: string;
    readonly proof: File | undefined;
  }) => void;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const complete =
    name.trim() !== '' && phone.trim() !== '' && email.trim() !== '';

  return (
    <form
      className="pad stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (!complete || submitting) return;
        onSubmit({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          proof: proof ?? undefined,
        });
      }}
    >
      <div className="center">
        <div style={{ fontSize: 56 }} aria-hidden="true">
          🗓️
        </div>
        <h1 className="page-title">You&apos;re all set! 🎉</h1>
        <p className="muted">
          Drop a deposit via M-Pesa to lock in your booking — then upload the
          confirmation message below.
        </p>
      </div>

      <div className="center">
        {/*
          A hidden input driven by a text link, per the spec. The label is a
          button rather than a `<label>` so it can be styled as the inline link
          the design asks for without inheriting label click semantics on the
          surrounding text.
        */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => setProof(event.target.files?.[0] ?? null)}
        />
        {proof === null ? (
          <button
            type="button"
            className="linkish"
            onClick={() => fileInput.current?.click()}
          >
            Upload confirmation message here
          </button>
        ) : (
          // The "file attached" state the spec notes is undesigned. Without it
          // there is no feedback that the picker did anything, and a client
          // would tap it repeatedly.
          <p>
            <span>{proof.name} </span>
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setProof(null);
                // Cleared so re-picking the SAME file fires `change` again —
                // an input that still holds it emits nothing on reselect.
                if (fileInput.current !== null) fileInput.current.value = '';
              }}
            >
              Remove
            </button>
          </p>
        )}
      </div>

      <input
        className="field"
        placeholder="John Doe"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="Your name"
        required
      />
      <input
        className="field"
        type="tel"
        placeholder="Phone number"
        autoComplete="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        aria-label="Phone number"
        required
      />
      <input
        className="field"
        type="email"
        placeholder="address@mail.com"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-label="Email address"
        required
      />

      <p className="muted center" style={{ fontSize: 14 }}>
        Drop your email in here, and {salonName} will ping you the booking
        confirmation!
      </p>

      {error !== null && (
        <p className="error-text center" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn btn--solid btn--block"
        disabled={!complete || submitting}
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}

/**
 * What replaces the form once the booking is made.
 *
 * The spec flags that no post-submit state was designed. This is it: the form is
 * REPLACED rather than left on screen with a toast, because a form still holding
 * a name and a phone number invites a second submission — which would be a
 * second booking in a second slot.
 */
export function BookingMade({
  salonName,
}: {
  readonly salonName: string;
}): React.ReactElement {
  return (
    <div
      className="pad center stack"
      style={{ paddingTop: 'var(--space-xxl)' }}
    >
      <div style={{ fontSize: 56 }} aria-hidden="true">
        🎉
      </div>
      <h1 className="page-title">Booking received</h1>
      <p className="muted">
        {salonName} will confirm by email. Keep an eye on your inbox.
      </p>
    </div>
  );
}
