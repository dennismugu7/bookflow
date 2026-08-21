import { useEffect, useRef, useState } from 'react';

export interface TabSpec {
  readonly id: string;
  readonly label: string;
}

/**
 * The anchor-tab bar.
 *
 * ══ THE UNDERLINE TRACKS SCROLL POSITION, NOT CLICKS ════════════════════════
 *
 * The spec is specific about this and it is the whole reason the component
 * exists: "have the ProfileTabs component scroll to (scrollIntoView) the
 * matching section on click, while ALSO using an IntersectionObserver ... to
 * update which tab shows as 'active' as the user scrolls naturally — the
 * underline indicator should track scroll position, not just click state."
 *
 * A click-only version is half the code and wrong in the ordinary case: a
 * visitor scrolls this page with their thumb, and the tabs would sit on
 * "Services" while they read the opening hours.
 *
 * ── WHY A `rootMargin` AND NOT A PLAIN THRESHOLD ───────────────────────────
 *
 * The tab bar is sticky, so it covers the top of whatever is under it. Without
 * the negative top margin the observer reports a section as visible while it is
 * hidden behind the bar, and the underline changes one section early. The
 * bottom margin is what stops several sections counting as active at once: the
 * observation band is a thin strip below the bar rather than the whole viewport.
 *
 * ── EMPTY SECTIONS ARE NOT TABBED ──────────────────────────────────────────
 *
 * The caller passes only the tabs whose sections exist. A salon with no team
 * gets no Team tab — rather than a tab that scrolls to nothing, which is the
 * "promise the app does not keep" that the owner app's checklist comment names.
 */
export function ProfileTabs({
  tabs,
}: {
  readonly tabs: readonly TabSpec[];
}): React.ReactElement | null {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? '');
  const barRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (tabs.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Several sections can be in the band at once during a fast scroll.
        // The topmost one wins, which is what a reader would call "where I am".
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const top = visible[0]?.target.id;
        if (top !== undefined) setActive(top);
      },
      { rootMargin: '-72px 0px -70% 0px', threshold: 0 },
    );

    for (const tab of tabs) {
      const section = document.getElementById(tab.id);
      if (section !== null) observer.observe(section);
    }

    return () => {
      observer.disconnect();
    };
  }, [tabs]);

  if (tabs.length === 0) return null;

  return (
    <nav className="tabs" ref={barRef} aria-label="Sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="tab"
          aria-current={active === tab.id}
          onClick={() => {
            // Set immediately as well as letting the observer catch up: a
            // smooth scroll takes a moment, and a tab that stays inactive until
            // the scroll lands feels like the tap was missed.
            setActive(tab.id);
            document
              .getElementById(tab.id)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
