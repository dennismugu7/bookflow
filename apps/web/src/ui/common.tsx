import { initialsOf } from '../lib/format';

/** The one loading indicator. */
export function Spinner(): React.ReactElement {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

/**
 * A full-screen message with no chrome.
 *
 * Used for both "no such salon" and "could not load". They are separate states
 * with separate copy — see `useSalon` — and share only their shape.
 */
export function Notice({
  title,
  body,
  action,
}: {
  readonly title: string;
  readonly body: string;
  readonly action?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="shell">
      <div className="pad center" style={{ paddingTop: '25dvh' }}>
        <h1 className="page-title">{title}</h1>
        <p className="muted">{body}</p>
        {action}
      </div>
    </div>
  );
}

/**
 * A team member's photo, or their initials.
 *
 * ── THE FALLBACK IS THE COMMON CASE, NOT THE EDGE ──────────────────────────
 *
 * `photoUrl` is optional in the owner app, and a salon that has added three
 * people without photographing them is entirely ordinary. Rendering a broken
 * image icon there would look like the site was failing; initials look
 * deliberate.
 *
 * `onError` covers the second case — a URL that exists and does not load,
 * because the object was deleted from the bucket — which `photoUrl === null`
 * does not catch.
 */
export function Avatar({
  name,
  photoUrl,
}: {
  readonly name: string;
  readonly photoUrl: string | null;
}): React.ReactElement {
  if (photoUrl === null || photoUrl === '') {
    return (
      <div className="avatar avatar--initials" aria-hidden="true">
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <img
      className="avatar"
      src={photoUrl}
      alt={name}
      loading="lazy"
      onError={(event) => {
        // Swapped for the initials rather than hidden: an empty circle in a row
        // of faces reads as a missing person.
        const img = event.currentTarget;
        img.replaceWith(
          Object.assign(document.createElement('div'), {
            className: 'avatar avatar--initials',
            textContent: initialsOf(name),
          }),
        );
      }}
    />
  );
}
