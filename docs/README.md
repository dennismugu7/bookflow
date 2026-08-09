# Bookflow — Source Materials

This folder is the **read-only source of truth** for the Bookflow build. Nothing in here
gets edited. Everything we generate (specs, tokens, CLAUDE.md, ADRs) is derived from it
and lives elsewhere in the repo.

## Layout

```
docs/
├── README.md                    ← you are here
├── source/                      ← the original documents, do not edit
│   ├── Manual-Project-Scaffolding.pdf/.md   Phases 0–6: building the foundation
│   ├── Manual-Feature-Scaffolding.pdf/.md   Phases 0–10: the per-feature loop
│   ├── Styles-Reference.pdf/.md             visual language: colour, type, shape
│   ├── DD-Bookflow-Native.pdf/.md           owner-facing mobile app, ~24 screens
│   └── DD-Bookflow-Web.pdf/.md              client-facing booking web app, ~11 pages
└── designs/
    ├── native/                  28 screenshots, in document order
    └── web/                     16 screenshots, in document order
```

The `.md` files are plain-text extractions of the PDFs — use them for reading, grepping
and quoting. The `.pdf` files are authoritative if the two ever disagree (bullet nesting
and tables survive better in the PDF).

## Reading the design docs

Both design documents follow the same per-screen structure:

1. **UI Elements** — what the user sees
2. **Layout Notes** — spacing, alignment, structure
3. **User Interactions & Action Flows** — for each interaction: **Frontend Action** and
   **Backend / System Action**
4. **Open Questions** — the author's own unresolved items, flagged inline

Point 3 is the most valuable part: the backend actions are effectively a first draft of
the API surface. Point 4 must be resolved by a human before the affected screen is built
— these are not to be guessed at.

## Image filenames

Screenshot filenames are derived automatically from the nearest heading in the PDF and
are approximate. A few are `untitled` or carry a stray sentence. **The document is
authoritative for what a screen is called** — treat the filename as a hint only. They are
in document order, so `native-00` is the first screenshot in the native doc, and so on.

## The two products

| | Native (`DD-Bookflow-Native`) | Web (`DD-Bookflow-Web`) |
|---|---|---|
| User | the salon/barber **owner** | the **client** booking an appointment |
| Role | **produces** the data | **consumes** the data |

One backend, one database, two clients. The web app's opening hours, services, team and
portfolio all originate in the owner's mobile app — the web doc states this explicitly in
its "Data Source Summary" sections.

## Build order

Shared backend → native owner app → client web app.
