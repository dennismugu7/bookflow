import { useState } from 'react';

import type { OpeningHours, Salon, Service, TeamMember } from '../api/types';
import { formatDuration, formatKes } from '../lib/format';
import { hoursFor, openState, salonNow, weekdayName } from '../lib/salonTime';
import { Avatar } from '../ui/common';

/**
 * The hero: a peek carousel of portfolio images, or the banner, or a gradient.
 *
 * ── THREE FALLBACKS, IN THAT ORDER, AND EACH IS A REAL SALON ──────────────
 *
 * A salon that uploaded work samples gets the carousel. One that only set a
 * banner gets the banner. One that did neither — publishable, since the API's
 * gate is a name, one service and one open day — gets the gradient rather than
 * an empty box or a stock photograph of somebody else's salon.
 *
 * The counter is driven by scroll position rather than by a click handler,
 * because the carousel is scroll-snapped and swiped, not paged by buttons.
 */
export function Hero({ salon }: { readonly salon: Salon }): React.ReactElement {
  const images = salon.portfolioImageUrls;
  const [index, setIndex] = useState(0);

  if (images.length > 0) {
    return (
      <div className="hero">
        <div
          className="hero__track"
          onScroll={(event) => {
            const track = event.currentTarget;
            const slide = track.scrollWidth / images.length;
            // Rounded rather than floored: a snap lands within a pixel or two
            // of the boundary, and flooring shows `1/6` while the second slide
            // is centred.
            const at = Math.round(track.scrollLeft / slide);
            setIndex(Math.min(Math.max(at, 0), images.length - 1));
          }}
        >
          {images.map((url, position) => (
            <div className="hero__slide" key={url}>
              <img
                src={url}
                alt={`${salon.name} — work sample ${String(position + 1)}`}
                loading={position === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="hero__counter">
            {index + 1}/{images.length}
          </div>
        )}
      </div>
    );
  }

  if (salon.bannerUrl !== null && salon.bannerUrl !== '') {
    return (
      <div className="hero">
        <img className="hero__banner" src={salon.bannerUrl} alt={salon.name} />
      </div>
    );
  }

  return <div className="hero" />;
}

/** The live open/closed line, computed against Africa/Nairobi. */
function StatusLine({
  hours,
}: {
  readonly hours: readonly OpeningHours[];
}): React.ReactElement | null {
  const state = openState(hours);

  if (state.open) {
    return (
      <p className="status-line">
        <span aria-hidden="true">🕘</span>
        <span className="status-line__word status-line__word--open">Open</span>
        <span className="muted">· until {state.until}</span>
      </p>
    );
  }

  return (
    <p className="status-line">
      <span aria-hidden="true">🕘</span>
      <span className="status-line__word status-line__word--closed">
        Closed
      </span>
      {state.opensAt !== null && (
        <span className="muted">· Opens at {state.opensAt}</span>
      )}
    </p>
  );
}

/** Name, tagline, category, and the status line. */
export function TitleBlock({
  salon,
}: {
  readonly salon: Salon;
}): React.ReactElement {
  return (
    <div className="pad">
      <h1 className="salon-name">{salon.name}</h1>
      {salon.tagline !== null && salon.tagline !== '' && (
        <p className="salon-tagline">{salon.tagline}</p>
      )}
      {salon.category !== null && salon.category !== '' && (
        <p className="salon-category">{salon.category}</p>
      )}
      <StatusLine hours={salon.openingHours} />
    </div>
  );
}

/** About, clamped to four lines with an inline Read more. */
export function AboutSection({
  about,
}: {
  readonly about: string;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="pad">
      <h2 className="section-title">About</h2>
      <p
        className={
          expanded ? 'about__body' : 'about__body about__body--clamped'
        }
      >
        {about}
      </p>
      {/*
        Rendered unconditionally rather than only when the text overflows.
        Measuring whether four lines were actually exceeded means reading
        `scrollHeight` after layout, in an effect, on every resize — and getting
        it wrong hides the control on a narrow screen where it is needed most.
        A "Read more" on a short about expands nothing visible and costs a tap.
      */}
      <button
        type="button"
        className="linkish"
        onClick={() => setExpanded((was) => !was)}
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </section>
  );
}

/** The services list. Each card books its own service. */
export function ServicesSection({
  services,
  onBook,
}: {
  readonly services: readonly Service[];
  readonly onBook: (service: Service) => void;
}): React.ReactElement {
  return (
    <section className="pad" id="services">
      <h2 className="section-title">Services</h2>
      {services.map((service) => (
        <div className="card service" key={service.id}>
          <div className="service__body">
            <p className="service__name">{service.name}</p>
            <p className="service__meta">
              {formatDuration(service.durationMinutes)}
            </p>
            <p className="price">{formatKes(service.priceKes)}</p>
          </div>
          {/*
            The spec: "Tapping 'Book' on a given card should carry that
            service's context forward into the next screen — so the component
            needs to pass service data on click, not just navigate blank."
          */}
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => onBook(service)}
          >
            Book
          </button>
        </div>
      ))}
    </section>
  );
}

export function TeamSection({
  team,
}: {
  readonly team: readonly TeamMember[];
}): React.ReactElement {
  return (
    <section className="pad" id="team">
      <h2 className="section-title">Team</h2>
      <div className="team-grid">
        {team.map((member) => (
          <div className="team-member" key={member.id}>
            <Avatar name={member.name} photoUrl={member.photoUrl} />
            <p className="team-member__name">{member.name}</p>
            {member.role !== null && member.role !== '' && (
              <p className="team-member__role">{member.role}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The 3-column grid, and a lightbox that walks the whole set. */
export function PortfolioSection({
  images,
}: {
  readonly images: readonly string[];
}): React.ReactElement {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="pad" id="portfolio">
      <h2 className="section-title">Portfolio</h2>
      <div className="portfolio-grid">
        {images.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpen(index)}
            aria-label={`Open image ${String(index + 1)}`}
          >
            <img src={url} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Portfolio image"
          // Tap-outside to dismiss. The check is on the target being the
          // backdrop itself, so a tap on the image does not close it.
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(null);
          }}
        >
          <button
            type="button"
            className="lightbox__close"
            onClick={() => setOpen(null)}
            aria-label="Close"
          >
            ×
          </button>
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox__nav"
              style={{ left: 'var(--space-md)' }}
              // Wraps rather than stopping: a gallery you cannot get out of the
              // end of feels broken, and there is no "first image" to protect.
              onClick={() =>
                setOpen((at) => ((at ?? 0) - 1 + images.length) % images.length)
              }
              aria-label="Previous image"
            >
              ‹
            </button>
          )}
          <img src={images[open]} alt="" />
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox__nav"
              style={{ right: 'var(--space-md)' }}
              onClick={() => setOpen((at) => ((at ?? 0) + 1) % images.length)}
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * The seven-day schedule, today in bold.
 *
 * ── IT ITERATES SEVEN DAYS, NOT THE ROWS THAT ARRIVED ──────────────────────
 *
 * A closed day has NO ROW in the API's response — absence is the closed state.
 * Mapping over `openingHours` would silently produce a four-row list for a salon
 * that shuts on weekends, and a visitor would have no way to tell "closed" from
 * "not listed".
 */
export function OpeningHoursSection({
  hours,
}: {
  readonly hours: readonly OpeningHours[];
}): React.ReactElement {
  const today = salonNow().dayOfWeek;

  return (
    <section className="pad">
      <h2 className="section-title">Opening times</h2>
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const entry = hoursFor(hours, day);
        const isToday = day === today;
        const closed = entry === undefined;

        return (
          <div
            key={day}
            className={[
              'hours-row',
              isToday ? 'hours-row--today' : '',
              closed ? 'hours-row--closed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              className={
                closed
                  ? 'hours-row__dot hours-row__dot--closed'
                  : 'hours-row__dot'
              }
              aria-hidden="true"
            />
            <span className="hours-row__day">{weekdayName(day)}</span>
            <span>
              {closed ? 'Closed' : `${entry.openTime} – ${entry.closeTime}`}
            </span>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Address and a directions link.
 *
 * ── NO MAP EMBED, AND THAT IS A DECISION RATHER THAN AN OMISSION ───────────
 *
 * The spec asks for a static Google map with a custom pin. That needs a Maps
 * Static API key, which is a billed credential shipped to every browser that
 * opens a salon page — and the data model has no coordinates, only an
 * owner-typed address string and whatever URL they pasted.
 *
 * So v1 shows the address and links out. The link is the part that works:
 * tapping it opens the owner's own Maps URL, which is more accurate than
 * anything geocoded from a free-text address would be.
 */
export function LocationSection({
  address,
  mapsUrl,
}: {
  readonly address: string | null;
  readonly mapsUrl: string | null;
}): React.ReactElement | null {
  const hasAddress = address !== null && address !== '';
  const hasLink = mapsUrl !== null && mapsUrl !== '';

  // The whole section is hidden when there is nothing to show — an empty
  // "Location" heading is worse than no heading.
  if (!hasAddress && !hasLink) return null;

  return (
    <section className="pad">
      <h2 className="section-title">Location</h2>
      <p>
        {hasAddress && <span>{address} </span>}
        {hasLink && (
          <a
            href={mapsUrl}
            target="_blank"
            // `noreferrer` implies `noopener`, and both matter: this is an
            // owner-supplied URL, so the destination is not ours to trust with
            // a handle on this window.
            rel="noreferrer"
          >
            Get directions
          </a>
        )}
      </p>
    </section>
  );
}
