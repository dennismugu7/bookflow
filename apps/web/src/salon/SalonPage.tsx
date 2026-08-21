import { useNavigate, useParams } from 'react-router-dom';

import type { Service } from '../api/types';
import { ProfileTabs, type TabSpec } from './ProfileTabs';
import {
  AboutSection,
  Hero,
  LocationSection,
  OpeningHoursSection,
  PortfolioSection,
  ServicesSection,
  TeamSection,
  TitleBlock,
} from './sections';
import { useSalon, useSalonTitle } from './useSalon';
import { Notice, Spinner } from '../ui/common';

/**
 * `/:handle` — the salon's public page.
 *
 * ══ ONE SCROLLING PAGE, NOT FIVE ROUTES ═════════════════════════════════════
 *
 * The spec's own correction, after seeing all the screenshots together: "this
 * confirms the page is one continuous vertically-scrolling page, not separate
 * routed views. The tab bar functions as an anchor-link navigator."
 *
 * That is why the tabs scroll rather than navigate, and why there is no
 * per-section route to be linked to or bookmarked.
 */
export function SalonPage(): React.ReactElement {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const state = useSalon(handle);

  useSalonTitle(state.status === 'ready' ? state.salon : undefined);

  if (state.status === 'loading') {
    return (
      <div className="shell">
        <Spinner />
      </div>
    );
  }

  if (state.status === 'missing') {
    // ── ONE MESSAGE FOR TWO CAUSES, DELIBERATELY ────────────────────────────
    //
    // A 404 means the handle is unknown OR the salon has not published (ADR-004
    // keeps business data private until it is). A visitor can act on neither,
    // and the second is common enough — owners share their link before going
    // live — that "not taking bookings yet" is the kinder and more often
    // accurate reading.
    return (
      <Notice
        title="Not available"
        body="This salon isn't taking bookings yet."
      />
    );
  }

  if (state.status === 'failed') {
    return (
      <Notice
        title="Something went wrong"
        body="We couldn't load this page. Check your connection and try again."
        action={
          <button
            type="button"
            className="btn btn--solid"
            style={{ marginTop: 'var(--space-lg)' }}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        }
      />
    );
  }

  const { salon } = state;
  const hasTeam = salon.teamMembers.length > 0;
  const hasPortfolio = salon.portfolioImageUrls.length > 0;
  const hasAbout = salon.about !== null && salon.about !== '';
  const hasLocation =
    (salon.address !== null && salon.address !== '') ||
    (salon.mapsUrl !== null && salon.mapsUrl !== '');

  // ── TABS ARE OMITTED WHEN THEIR SECTION IS EMPTY ─────────────────────────
  //
  // A tab that scrolls to nothing is a control that appears broken. "Other"
  // exists whenever there is something under it — the opening hours always
  // qualify, since a salon cannot publish without at least one open day.
  const tabs: TabSpec[] = [
    { id: 'services', label: 'Services' },
    ...(hasTeam ? [{ id: 'team', label: 'Team' }] : []),
    ...(hasPortfolio ? [{ id: 'portfolio', label: 'Portfolio' }] : []),
    { id: 'other', label: 'Other' },
  ];

  const startBooking = (service?: Service): void => {
    void navigate(`/${salon.handle}/book`, {
      // The service the visitor tapped travels in router state rather than in
      // the URL: it is a starting selection, not an address. A `?serviceId=`
      // would be a link someone could share that skips a step in a flow they
      // never began.
      state: service === undefined ? undefined : { serviceId: service.id },
    });
  };

  return (
    <div className="shell">
      <Hero salon={salon} />
      {/* The sheet's negative top margin is what produces the overlap the spec
          calls the page's defining pattern. */}
      <div className="sheet">
        <TitleBlock salon={salon} />
      </div>

      <ProfileTabs tabs={tabs} />

      <div className="stack" style={{ paddingBlock: 'var(--space-lg)' }}>
        {hasAbout && <AboutSection about={salon.about ?? ''} />}

        <ServicesSection services={salon.services} onBook={startBooking} />

        {hasTeam && (
          <>
            <hr className="divider" />
            <TeamSection team={salon.teamMembers} />
          </>
        )}

        {hasPortfolio && (
          <>
            <hr className="divider" />
            <PortfolioSection images={salon.portfolioImageUrls} />
          </>
        )}

        <hr className="divider" />
        {/*
          `#other` wraps both blocks, which is what the spec's fifth tab means:
          "treat 'Opening Times' + 'Location' as the content block anchored
          under #other".
        */}
        <div id="other">
          <OpeningHoursSection hours={salon.openingHours} />
          {hasLocation && (
            <LocationSection address={salon.address} mapsUrl={salon.mapsUrl} />
          )}
        </div>
      </div>

      <BookNowFooter
        serviceCount={salon.services.length}
        onBook={() => startBooking()}
      />
    </div>
  );
}

/**
 * The sticky BOOK NOW bar.
 *
 * The spec flags the inline-vs-fixed question and recommends fixed: the block
 * is described as persisting across pages and is "the primary conversion
 * action", and this page is long. Sticky rather than `position: fixed` so it
 * stays inside the centred column instead of spanning a wide screen.
 */
function BookNowFooter({
  serviceCount,
  onBook,
}: {
  readonly serviceCount: number;
  readonly onBook: () => void;
}): React.ReactElement {
  return (
    <div className="sticky-footer">
      <div className="sticky-footer__text">
        <div>Ready for a fresh look?</div>
        {/* The count is dynamic, per the spec's `Check out our {n} services`. */}
        <div>
          Check out our {serviceCount}{' '}
          {serviceCount === 1 ? 'service' : 'services'}
        </div>
      </div>
      <button
        type="button"
        className="btn btn--solid btn--cta"
        onClick={onBook}
      >
        Book now
      </button>
    </div>
  );
}
