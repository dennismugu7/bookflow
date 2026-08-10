# ADR-009 — Money representation

**Status:** Accepted

## Context

Neither design document says how money is stored. Prices appear only as display strings —
"KES 140", "KES 400", "from KES 400", and a stray "€9" the web author flags as probably a
mockup error. All are whole numbers with no decimals, which tells us nothing about the
underlying type.

Both scaffolding manuals name payment math as Do-Not-Vibe territory. The Feature manual
lists it first among the things that "get human hands, not an unattended queue," and the
Project manual repeats it in its app-specific Do-Not-Vibe surface.

Money flows through more of this product than the price on a service card: line-item
prices and a computed total (ADR-006), a deposit amount, and a "total spent" per contact
(ADR-008). Every one of those is a place a float would drift.

## Decision

Money is stored as **integer minor units in a `bigint` column**. Never floating point,
never a decimal string.

Currency is KES per ADR-005 and is **not stored per-row** in v1.

A **single formatting helper owns all display**. No view formats money inline.

## Consequences

- Rounding is explicit and happens once, at the point a calculation demands it, rather
  than accumulating silently through float arithmetic.
- `bigint` rather than `int` costs nothing and removes any ceiling question, including for
  aggregate figures like total spent.
- Adding a currency column later is additive, and every existing row backfills as KES —
  but until then, nothing in the schema records that the numbers are shillings. That fact
  lives in this ADR and in the formatting helper, and nowhere else.
- The formatting helper becomes the single place where C3 (symbol position, separators,
  decimal places) is answered, and the single place a second currency would be handled.
- Minor units for KES are cents. Whether the UI ever renders them is a display decision,
  not a storage one.

## Items resolved

C2 (money storage representation). It was F.

## Items created

None. C3 (formatting rules) narrows to a single function's behaviour but remains open and
deferrable.
