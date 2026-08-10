# Bookflow — docs

Entry point to `docs/`. Rules for the code live in `/CLAUDE.md`; this file says what is in
here and how much each part is allowed to change.

## What changes, and what does not

| Path | Nature |
|---|---|
| `source/` | **Immutable.** The original manuals, style reference and design docs. Never edited, never corrected — a mistake in here is a fact about the brief. |
| `spikes/` | **Immutable verdicts.** Observations at a moment, written once. Amendable only by appending a dated `## Amendments` section; nothing above it is touched. |
| `decisions/` | **Append-only.** One ADR per decision. Context, Decision and Consequences are never rewritten; a dated `## Amendments` section may be appended to record what has moved on. A *reversal* is a new ADR superseding the old one, never an edit. |
| `analysis/` | **Derived, and updated as decisions land.** Read off `source/`, then revised when an ADR resolves or narrows an item. Never edited to *make* a decision — only to record that one was made elsewhere. |
| `BUILD_LOG.md` | **Mutable.** Phase status, process and the decision index. Holds nothing that can go stale without a decision changing. |
| `ENVIRONMENT.md` | **Mutable by design.** State of the world outside the repository — tools, remotes, hosted projects, deploy targets — each claim with the command that verifies it. Updated in the same commit as the change it records. |

The amendment convention for `decisions/` and `spikes/` is stated in `CLAUDE.md` §3.

## Reading order for a newcomer

1. **`/CLAUDE.md`** — the rules. Not self-sufficient; it states them without the situation.
2. **`BUILD_LOG.md`** — where the project stands, and what happens next.
3. **`ENVIRONMENT.md`** — what actually exists outside the repo right now.
4. **`decisions/`** — why every rule is the rule. Numbered; each states what it resolves.
5. **`analysis/05-triage.md`** — what is still open, and which slice each item blocks.
6. **`source/`** — the brief itself, when you need what was actually asked for.

Steps 1–3 are enough to know the situation. Step 4 is what stops you re-deciding something.

## Layout

```
docs/
├── README.md          ← you are here
├── BUILD_LOG.md       phase status, process, decision index
├── ENVIRONMENT.md     tools, remotes, hosted projects — the one mutable record
├── source/            Manual-Project-Scaffolding (Phases 0–6, the foundation) ·
│                      Manual-Feature-Scaffolding (Phases 0–10, per feature) ·
│                      Styles-Reference · DD-Bookflow-Native · DD-Bookflow-Web
├── analysis/          01 screens · 02 backend capabilities · 03 ambiguities
│                      04 unstated assumptions · 05 triage
├── decisions/         one file per ADR
├── spikes/            executed write-ups; code deleted, verdicts kept
└── designs/           native/ 28 screenshots · web/ 16, both in document order
```

## Precedence

**`source/` wins over anything derived from it**, including all of `analysis/`.

Within `source/`, each document exists as both `.pdf` and `.md`. **The PDF wins.** The `.md`
files are plain-text extractions — use them for reading, grepping and quoting — but bullet
nesting and tables survive better in the PDF, so where the two disagree the PDF is
authoritative.

**Screenshot filenames are hints only** — auto-derived from the nearest heading, so a few are
`untitled` or carry a stray sentence. The document names the screen, not the file.

## Reading the design docs

Both follow one per-screen structure: **UI Elements** · **Layout Notes** · **User Interactions
& Action Flows** (split into Frontend Action and Backend / System Action) · **Open Questions**.
`DD-Bookflow-Native` is the **owner** producing the data, `DD-Bookflow-Web` the **client**
consuming it — `CLAUDE.md` §1.

The Action Flows are the most valuable part: the backend actions are effectively a first draft
of the API surface. The Open Questions are the author's own unresolved items — decided by a
human before the affected screen is built, never guessed at, and tracked in
`analysis/05-triage.md`.
