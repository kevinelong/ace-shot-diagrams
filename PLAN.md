# Improvement Plan — June 2026

Five phases, executed in order, each gated by its own test before commit.

**Status: all five phases complete.** Battery 9/9 (verify-consistency.js),
Rust parity 8/8 (verify-rust-parity.js), animation smoke test passing.
Phase-5 note: the crate ended up ZERO-dependency (no serde/wasm-bindgen)
because proc-macros need a host MSVC linker, which this machine lacks —
the wasm builds with bundled rust-lld alone and speaks a flat-f64/JSON ABI.
Native `cargo test` unit tests exist but require MSVC Build Tools.

## Phase 1 — Sim/solver consistency (truthfulness)
**Problem:** the solver rates shots "makeable" that the simulation then misses
(observed: a straight-in banked off three rails). Prime suspect: the physics
rails are full-length walls with no pocket mouths, so balls bounce off the
cushion line before the pocket-radius check can capture them.

**Work:**
- `tests/battery.json` — shared battery of solver-makeable shots (straight-ins,
  cut series, side-pocket shots) with expected ball + pocket.
- `verify-consistency.js` — runs each through the app headless, asserts the
  intended ball drops in the intended pocket (via ACE_SHOT pocket events).
- Fix the physics until the battery passes: pocket-mouth gaps in rail
  collision, capture geometry, contact-angle fidelity (substep size) as needed.

**Test:** battery green; verify-animation.js still passes.
**Later:** this battery becomes the acceptance spec for the Phase-5 Rust core.

## Phase 2 — Trajectory trails on keyframes/GIFs
Balls travel in straight lines between recorded events, so each ball's full
path is exactly the polyline through its event snapshots (initial → events →
final). Draw faded trails (cue white, object balls gold) on every keyframe,
cumulative up to that moment, with an arrowhead on the latest segment.
The **rest** frame with full trails doubles as a complete static shot diagram
for print. Flag: `--no-trails`.

**Test:** straight-in + kick GIFs regenerate; trails match event log visually.

## Phase 3 — Annotation primitives for brochure parity
Extend the `a:` grammar (backward compatible):
- `Text@x,y` — label (existing)
- `Text@x,y>tx,ty` — label + leader line to a target point (dot at target)
- `Text@cx,cy*r,a1,a2` — angle arc of radius r from a1° to a2° (label at mid-arc)

**Test:** recreate the ghost-ball cutout teaching diagram (aim/pocket lines,
ghost ball, 30° arc, leader-line labels) in print theme; visual check against
the legacy `diagram_cutout.pdf`.

## Phase 4 — Curriculum scenario library
`scenarios/curriculum.json`: named, annotated teaching positions mirroring the
bootcamp chapters — straight-in, cut series (15/30/45°), stun/follow/draw,
kick 1-rail, bank cross-side, combination. One command regenerates every
figure in any theme:
`node render-scenarios.js scenarios/curriculum.json --table-only --theme print`

**Test:** batch renders clean; spot-check key figures.
**Future:** QR codes on printed figures linking to the same state string live.

## Phase 5 — Rust/WASM event-based physics core v1
`ace-physics/` crate. Continuous-time, event-driven: with every ball under the
same exponential rolling friction (per-step 0.985 @60Hz ⇒ λ≈0.907/s), positions
are linear in warped time τ(t)=(1−e^(−λt))/λ, so ball-ball contacts, cushion
hits, and pocket captures are exact quadratic solves — **no tunneling, no
timestep, perfectly smooth trajectories by construction**. Same COR/threshold
semantics as the JS sim. API: `simulate(state) → {events, final}` (serde JSON
via wasm-bindgen).

**Work:** crate + native unit tests → `wasm-pack build --target nodejs` →
`verify-rust-parity.js` running the Phase-1 battery through the wasm module.
**Out of scope for v1:** spin/throw model, browser integration (needs base64
embedding to keep the single-file ethos) — documented as next steps.

**Test:** cargo test green; battery passes through wasm.
