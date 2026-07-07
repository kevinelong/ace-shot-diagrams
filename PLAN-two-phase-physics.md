# Plan — two-phase physics (branch `physics-two-phase-friction`)

Upgrade ACE's physics from a single exponential-friction model (+ a bolted-on
"spin" event, with `centre = stun`) to a real **two-phase slide→roll (Coriolis)**
core where follow / stun / draw **emerge** from the spin the cue carries into a
collision. Same family as pooltool / Leckie–Greenspan.

## Current state (done in this branch)
- **New core** `ace-physics/src/lib.rs` (commit `01446fa`): each ball carries a
  linear velocity **v** and rolling velocity **s**; slips at `u = v−s`; slides
  under Coulomb friction (slip decays 7/2× → natural roll at 5/7 speed) then
  rolls under the tuned exponential resistance. Fixed timestep, sub-stepped
  (no tunneling); ball-ball contacts **rewind to the exact `BALL_D` gap** for a
  precise normal (this fixed cut misses). The host renders piecewise-linearly
  between emitted events, so the internal law is free.
- **Validation:** wasm battery `verify-rust-parity` **7/8** (all object balls
  pot; `cut-45` cue scratches). App harness `verify-shots` **4/6** (direct/bank/
  kick pot; `cut-45` + `combo` cue scratches). Unit tests **5/5** incl.
  `draw_returns_the_cue`. wasm re-embedded, so the app runs the new core.
- **Tooling unlocked:** `playwright-core` + system `/usr/bin/chromium` (musl-safe,
  no browser download) now drives the real app headless — run harnesses AND
  screenshot shots to PNG for visual inspection.

## Work items

### A. Reconcile the english-y sign (INVESTIGATE first — not assumed a bug)
Rendering draw/center/follow showed the cue's follow/draw **inverted** for my
state strings (`e:0,-1` drew back). The core is self-consistent (`English{y:1}`→
draw, unit-tested), matching the *old* core's convention, so this is a
**sign-convention** question, not necessarily an app defect. Trace the whole
chain end-to-end: **state-string `e:` parse → `contactOffset` → the cue-wheel UI →
`plan.english` → `aceSimulate`/`animateShotWasm`**. Determine whether the
**interactive** path (cue-wheel top = follow → cue follows) is actually correct;
if it is, only the state-string sign was mis-guessed (fix my render states). Fix
code **only** if a genuine interactive inconsistency exists. Validate by
rendering follow/center/draw and confirming cue-forward / mild / cue-back.

### B. Visual follow/draw feel tuning
With rendering, iterate `MU_SLIDE`, `SPIN_MAX`, `SPIN_RETAIN` (and the
natural-roll follow of a centre hit) against **actual pictures** of a fixed set
of reference shots (stun, follow-through distance, draw-back distance, a stun
cut). Capture the traveled **path** (screenshot mid-animation or via the app's
trail), not just the final frame. Keep `verify-rust-parity` object-potting green.

### C. Persist the render/verify tooling on this box
`verify-shots.cjs`/`record-shot.cjs` already use `playwright-core` + system
chromium (default `/usr/bin/chromium-browser`). `render-scenarios.js` /
`render-impacts.js` import `@playwright/test` and call `chromium.launch()` with
**no** executablePath → can't run here. One-line each: import `playwright-core`
and `launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' })`.
Keep `playwright-core` + `pngjs` in `package.json` (added). Add a short README/
"how to render a shot" note. Low effort, unlocks repeatable visual checks.

### D. Mirror the two-phase model into the JS fallback
The app uses the wasm by default, but the JS fallback sim in `index.html` still
runs the OLD model, so `verify-consistency` (Rust≈JS) and the wasm-off path are
now inconsistent. Port the same slide→roll + rewind-to-contact logic to the JS
sim. Medium effort; validate `verify-consistency` returns to green.

### E. Decide `cut-45` (and `combo`) cue scratch
Physically a firm centre-ball 45° cut **does** carom the cue into a pocket — the
old stun model hid it. Options: (1) accept the scratch as correct and note it;
(2) give those battery cases the touch of draw a real player would use (realistic;
one field each). Pick after B (tuning may change the margin). Do **not** silently
fudge — document whichever.

### F. Optional, larger realism (defer)
- **Han (2005) / Mathavan (2010) cushion model** — speed-dependent restitution +
  cushion-induced spin, replacing the flat `RAIL_COR`.
- **Masse / curve** — the core already tracks lateral slip; a sidespin `s`
  component would curve the cue path (currently sidespin only throws the OB).

## Sequence
A (investigate/reconcile sign) → C (wire render tooling, small) → B (visual feel
tuning) → E (cut-45 decision) → D (JS mirror) → then evaluate F. Merge to `main`
only after B+D land and the harnesses are green (or intentionally, documentedly
not).

## Validation gates (keep green, or change deliberately + documented)
- `cargo test --release` (unit) · `node verify-rust-parity.js` (wasm outcomes) ·
  `CHROMIUM_PATH=/usr/bin/chromium node verify-shots.cjs` (app outcomes) ·
  `node verify-consistency.js` (Rust≈JS, after D).

## Notes
- Toolchain: `rustup` + `wasm32-unknown-unknown` installed this session; rebuild
  with `cargo build --release --target wasm32-unknown-unknown` then
  `node embed-wasm.js` to re-embed into `index.html`.
- `verify-rust-parity.js` printer was hardened to handle non-hit event types.
