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

### A. Reconcile the english-y sign — ✅ RESOLVED (no bug; verified, not assumed)
Traced the whole chain (state `e:` → `contactOffset` → `computeShotPlan` →
`aceSimulate` → wasm): **english-y is passed through unflipped everywhere**, and
`contactOffset.y < 0 = follow` is consistent (index.html:10100). The apparent
"inversion" in the first render was a **test artifact**: with only two balls and
no pocket, the object rebounds off the far rail and **re-hits the cue**, dragging
it back — read as "draw". A clean test (object *potted*, no rebound) confirms the
sign is correct: `ey=-1` follows most (+8.4 past contact), `ey=+1` least (+3.4).
**No app or core change needed.** (Lesson: the object rebound confounds any
2-ball follow/draw measurement — always pot or remove the object.)

### B. Draw dynamics + feel tuning — ⚠️ OPEN MODELING PROBLEM (main next step)
Follow works well; **draw does not**. Findings this session (clean potting test,
cue 28 units from the object):
- Full draw (`ey=+1`) still creeps *forward* (+3.4), never reverses; centre
  follows (+4.7). The backspin **converts to forward roll before contact** —
  correct in principle (draw wears off with distance) but far too fast here.
- `SPIN_RETAIN` (post-collision spin damping) has **zero effect** on this shot —
  the backspin is gone before the collision, so damping it is moot. It only
  matters for cut over-follow.
- Sweeping `MU_SLIDE`↓ + `SPIN_MAX`↑ makes draw **converge to centre** (english
  loses effect) and everything follows *more* — the wrong direction. No swept
  config produced draw-back.
Conclusion: real draw needs a **model fix**, not a knob. Likely the slide-phase
spin evolution and/or the collision spin transfer isn't preserving enough
surviving backspin at realistic distances (a proper solid-sphere derivation of
the sliding backspin lifetime, and possibly making the cue keep its spin *axis*
through the collision rather than a scalar). Iterate with rendering (pot the
object so no rebound) on a fixed reference set (stun / follow distance / draw-back
distance / stun cut). Keep `verify-rust-parity` object-potting green.

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
- ✅ **A** — english sign investigated & resolved (no bug).
- **C** — wire the repo render tools to system chromium (small; locks in the
  visual loop). ← NEXT
- **B** — draw-dynamics model fix, iterated with rendering (the meaty one).
- **E** — decide the cut-45 / combo cue scratch (informed by B).
- **D** — mirror the two-phase model into the JS fallback.
- **F** — evaluate the Han cushion / masse extensions.

Merge to `main` only after B+D land and the harnesses are green (or intentionally,
documentedly not).

## Validation gates (keep green, or change deliberately + documented)
- `cargo test --release` (unit) · `node verify-rust-parity.js` (wasm outcomes) ·
  `CHROMIUM_PATH=/usr/bin/chromium node verify-shots.cjs` (app outcomes) ·
  `node verify-consistency.js` (Rust≈JS, after D).

## Notes
- Toolchain: `rustup` + `wasm32-unknown-unknown` installed this session; rebuild
  with `cargo build --release --target wasm32-unknown-unknown` then
  `node embed-wasm.js` to re-embed into `index.html`.
- `verify-rust-parity.js` printer was hardened to handle non-hit event types.
