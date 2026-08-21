import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { BookingFlow } from './booking/BookingFlow';
import { SalonPage } from './salon/SalonPage';
import './styles.css';

/**
 * ── THE ROOT PATH IS NOT A PAGE, AND DELIBERATELY SO ───────────────────────
 *
 * Every URL this app serves is a salon's: `/:handle`. There is no directory, no
 * search, and no landing page — a visitor arrives from a link the salon shared,
 * never by typing the origin.
 *
 * So `/` renders the same "no such salon" view as an unknown handle rather than
 * a marketing page nobody wrote. Building a placeholder would be dead UI.
 */
function Root(): React.ReactElement {
  return (
    <Routes>
      <Route path="/:handle" element={<SalonPage />} />
      <Route path="/:handle/book" element={<BookingFlow />} />
      {/*
        An unmatched deep path redirects to its first segment rather than 404ing
        outright — `/vera-salon/book/anything` is most likely a stale link into
        a flow whose shape changed, and the salon page is the useful place to
        land.
      */}
      <Route path="/:handle/*" element={<Navigate to=".." replace />} />
      <Route path="*" element={<SalonPage />} />
    </Routes>
  );
}

const container = document.getElementById('root');
if (container === null) {
  throw new Error('index.html is missing #root');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
);
