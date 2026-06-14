# UX Fixes Plan — June 2026

From the Playwright UX walkthrough (`ux-walkthrough.js`, captures in `ux-shots/`).
Order of execution: #1, #3, then #2, #4, #5/#6. Each verified headlessly and
committed on its own. Then design rolling-ball physics.

## #1 — Surface the Shot Info panel  (CRITICAL)
**Problem:** `#palette-shot` (the canonical Cut Angle / Make % / Sim % /
Difficulty panel) is `display:none` via the CSS rule at ~line 280
("Legend and Shot Info removed - merged into other palettes"), and its restore
button is hidden. The make-% and the new Sim % never reach the user. There is
also a dead, `display:none` duplicate block (~lines 2936-2995) carrying the
same element IDs, so `getElementById('cutAngleDisplay-palette')` resolves to the
dead copy (why Cut Angle read `--` while Make % worked — Make % is queried
scoped to `#palette-shot`).
**Fix:**
- Delete the dead duplicate block (removes the ID collision; live code then
  resolves to the real panel).
- Remove `#palette-shot` from the `display:none` rule (keep legend/save hidden).
- Add an anchor: `#palette-shot { bottom: 30px; right: 30px; }` (clears the
  bottom-center Cue palette and right-center Aids palette on desktop).
**Test:** headless — panel visible by default; after a configured shot, Cut
Angle / Make % / Sim % all populate (not `--`).

## #3 — Don't auto-rack over a shared link  (HIGH)
**Problem:** init runs `randomRack()` at +100ms unless `?empty=1`; a shared
`#v…` state link then loads on top, overlapping the full 15-ball rack.
**Fix:** in the init `setTimeout`, also skip the rack when a state hash is
present (`location.hash` starts with `#v`).
**Test:** headless — open a `#v…` URL (no `?empty=1`); only the configured
balls are on the table (rack count == balls in the state).

## #2 — Allow dragging balls out of the rack  (HIGH)
**Problem:** `startDrag` early-returns for anything inside `.tool-palette`, so
palette balls can't be dragged onto the table despite the affordance/aria.
**Fix:** special-case `.ball` elements inside `#palette-balls` so they bypass
the tool-palette guard; the existing `beginActualDrag` already relocates a
non-`on-table` ball into the table wrapper, and `endDrag` already handles
on-surface vs return-to-rack.
**Test:** real-mouse drag from the rack lands the ball on the surface
(`#ball-1` gains `on-table`).

## #4 — Mobile layout  (MEDIUM)
**Problem:** at 390×844 the table is tiny at the top, a large dead vertical gap
below, palettes crammed at the bottom; ball grid clipped, action buttons show
no labels, "Rack set" toast overlaps Shoot.
**Fix:** responsive pass — let the table fill available width, collapse the gap,
ensure the ball grid wraps/scrolls, keep action labels, lift the toast clear of
the Shoot button.
**Test:** headless 390×844 — table width ≳ 90% viewport; no element overlaps
the Shoot button; action buttons have visible text.

## #5 & #6 — Discoverability + polish  (MEDIUM/LOW)
- Collapsed Game/Aids palettes are unlabeled icons → add a small text label
  when minimized (or a tooltip/caption).
- Power defaults to 10 (break power) for every shot → default to a mid value
  for normal shots (break sets its own).
- Toast overlaps the Shoot button on desktop too → reposition toast.
**Test:** headless — minimized palettes expose an accessible label; default
power < 10 on a fresh normal setup; toast not overlapping Shoot.

## Rolling-ball physics visualization (design, then build)
Goal: users see balls actually ROLL (spin/rotation), not just translate. Design
written separately once #1–#6 land; key idea is to layer a rotation cue on top
of the event-driven core's exact trajectories without changing the physics
contract (positions stay authoritative; rotation is render-only).
