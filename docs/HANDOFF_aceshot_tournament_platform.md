# HANDOFF: AceShot pool tournament platform (research → spec → site integration)

State as of 2026-07-03, branch `claude/aceshot-repo-access-6n7axy`. This work
belongs in the `kevinelong/aceshot` repo; it lives here because this session
was scoped to `kevinelong/bfa` only. A new session scoped to `aceshot` should
migrate it (see Next steps).

## What is on this branch (vs main)

1. `docs/RESEARCH_pool_tournament_market_2026_07.md` — verified market research
   on DigitalPool, CompuSport, Challonge, CueScore, FargoRate LMS: pricing,
   feature gaps, app-store/forum pain points. Every claim passed 3-vote
   adversarial verification against live sources on 2026-07-02; one refuted
   claim and open questions are listed inside.
2. `docs/SPEC_pool_tournament_platform.md` — phased product spec:
   Phase 0 free MVP (trustworthy bracket engine, QR table scoring, free push
   match callouts) → Phase 1 DigitalPool parity (FargoRate, payments,
   multi-stage formats, discovery) → Phase 2 beyond (leagues, venues, open
   API, sanctioning bodies). Includes pricing strategy, risks, metrics.
3. `aceshot/` — a vendored snapshot of the live http://aceshot.com/ SPA
   (fetched 2026-07-03) with the two docs integrated as nav pages:
   - Original files: `index.html`, `main.css`, `style.css`, `utils.js`,
     `bracket.js`, `ace-shot-logo.png`.
   - Modified: `main.js` (imports `spec.js`/`research.js`, adds
     `🗺|Roadmap` and `🔎|Research` to `PAGES`/`CONTENT`),
     `main.css` (appended `.doc` styles + scrollable `.page.roadmap`/
     `.page.research`).
   - New: `spec.js`, `research.js` — ES modules exporting the docs as HTML
     strings, generated from the markdown via python-markdown
     (`tables`, `sane_lists` extensions).

## Gotchas the next session must know

- **`utils.js dict()` parses `CONTENT` line-by-line splitting on `|`.** Any
  HTML embedded in `CONTENT` must be a single line with zero literal pipe
  characters. The generators collapse whitespace and escape `|` → `&#124;`
  (also `` ` ``, `${`, `\` for JS template-literal safety). Regenerate with
  the same transform whenever the markdown docs change.
- `.page` is full-viewport with `overflow: hidden`; long-form pages need the
  per-page `overflow-y: auto` override already added for roadmap/research.
- `style.css` imports Google Fonts (Roboto Slab) — fails silently in
  sandboxed/offline environments; harmless.
- Verified in headless Chromium (Playwright): nav renders 8 entries, both doc
  pages load with correct headings and scroll, no JS errors.

## Next steps for the wider-scoped session

1. Copy `aceshot/*` into the `aceshot` repo (only `main.js` and `main.css`
   differ from the live site; `spec.js`/`research.js` are new). Bring the two
   `docs/*.md` sources along so regeneration stays possible.
2. Deploy to aceshot.com and sanity-check the two nav pages on a phone.
3. Optional cleanups queued behind that: remove this vendored copy from `bfa`
   once migrated; consider extracting the markdown→JS-module conversion into
   a small script committed next to the docs.
4. Research follow-ups (from the research doc's Open Questions): DigitalPool
   free-tier limits, FargoRate third-party API terms, organizer-side workflow
   sentiment — all feed Phase 1 planning in the spec.
