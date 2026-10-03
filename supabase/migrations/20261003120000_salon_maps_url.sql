-- Fix 2b-2: owners save the Google Maps link they shared; clients get directions from it.
-- Same pattern as GOOGLE_MAPS_URL in @bookflow/shared.

alter table public.salons
  add column maps_url text
    constraint salons_maps_url_check check (
      char_length(maps_url) <= 2000
      and maps_url ~* '^https://(maps\.app\.goo\.gl/|goo\.gl/maps|(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?/)'
    );
