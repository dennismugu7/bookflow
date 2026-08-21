-- Payment proofs move to the private bucket, and the column stops lying.
--
-- ══ WHY THIS IS A RENAME AND NOT AN ADDITIVE COLUMN ═════════════════════════
--
-- `payment_proof_url` held a URL into the PUBLIC bucket. That was a privacy
-- defect: a payment proof is a client's financial document, and a public-bucket
-- URL grants permanent access to anyone who ever sees it — in a log, in a
-- screenshot, in a database export.
--
-- The value stored is now an object KEY in `private-media`, which confers no
-- access at all. Reaching the object requires
-- `GET /v1/me/business/bookings/:id/payment-proof`, which authenticates the
-- caller, scopes the booking through membership, and mints a five-minute
-- signed URL.
--
-- **A key in a column called `_url` is exactly the kind of lie that costs an
-- hour**, and worse, it invites the next reader to render it directly — which
-- would produce a broken image rather than an error, and look like a bug in the
-- upload. So the column is renamed rather than reused.
--
-- ══ NO DATA MIGRATION, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT ══════
--
-- The old values are absolute public URLs; the new ones are relative keys. They
-- are not convertible by string surgery that would be safe to run — the public
-- prefix is environment-dependent, and a wrong guess would point the signing
-- call at an attacker-influenced path.
--
-- There are no rows in production use (the feature shipped days ago and has run
-- only against staging), so any surviving value is a staging artifact. Such a
-- row keeps its old string, `has_payment_proof` reports true for it, and the
-- signing call answers 404 `not-found` because no such key exists in the private
-- bucket. That is the honest failure: it says "the proof is not there", which is
-- true, rather than serving a public URL and calling the problem solved.
--
-- The objects already in `public-media` under `*/proof/*` are NOT deleted here.
-- A migration that deletes storage objects is a migration that cannot be rolled
-- back, and this one runs against staging first. `docs/ENVIRONMENT.md` carries
-- the cleanup as an owed manual step.

alter table public.bookings
  rename column payment_proof_url to payment_proof_key;

comment on column public.bookings.payment_proof_key is
  'Optional. An object key in the PRIVATE private-media bucket. Never a URL, and confers no access on its own: reads go through GET /v1/me/business/bookings/{id}/payment-proof, which returns a short-lived signed URL. Never exposed to a client — the owner bookings list carries a hasPaymentProof boolean instead.';
