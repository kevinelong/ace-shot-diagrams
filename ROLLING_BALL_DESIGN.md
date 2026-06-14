# Rolling-Ball Visualization — Design

Goal: during shot playback, balls should visibly **roll** (rotate), not just
slide across the felt. Render-only: the event-driven core stays authoritative
for positions; rotation is derived in the render layer, so the physics contract
and all batteries are untouched.

## Why it's non-trivial top-down
A flat disc with a centered number shows no rotation when it translates. A real
ball rolling forward rotates about a *horizontal* axis — so in the top-down view
its surface features scroll across the visible face along the travel direction
and wrap over the edge. A simple in-plane `rotate()` only captures *sidespin*
(vertical axis), not forward roll. We need both.

## The model (cheap + physically faithful)
Treat each ball as a sphere with a few surface "pips" (accent marks). No core
change: the render layer already interpolates positions between event snapshots,
so it can accumulate travel distance frame to frame.

- **Forward roll** about the axis ⟂ velocity. Roll phase advances by
  `Δφ = Δs / R` where `Δs` is distance moved this frame, `R` the ball radius.
  A pip at great-circle angle `φ` projects (top-down) to an offset **along the
  velocity heading** of `R·sin(φ + rollPhase)`, and is only visible on the front
  hemisphere: `opacity = max(0, cos(φ + rollPhase))`. A handful of pips at
  different starting `φ` (and small across-axis offsets) gives continuous,
  correct-looking roll: marks rise at the trailing edge, sweep forward, slow,
  and vanish over the leading edge.
- **Sidespin** (english.x) about the view normal: rotate the whole pip set
  in-plane by a cumulative angle that decays with speed. Pure flourish.
- **Slide vs roll**: the core already emits a `spin` event at the cue's
  slide→roll transition. Before it, render reduced roll (skid); after, full
  roll. Object balls roll from contact. Optional refinement; pure-roll-from-
  arclength already looks right for most of a shot.

Heading = direction of the current trajectory segment (known from the two
bracketing event snapshots). Distance = segment length × interpolation alpha.

## Visual treatment (recommended)
Keep the **number centered and upright** for legibility, and add **measle-style
pips** that scroll/spin to convey roll:
- Solid balls: 2–3 small dark pips on the colored field.
- Cue ball: the classic single **red meas"le" dot** (this is how real players
  see cue-ball spin) — instantly reads as rolling.
- Stripes: the stripe band scrolls under roll and tilts under sidespin.

This gives a strong rolling cue with minimal art and no readability loss. (A
full scrolling texture/number is more "rolling" but hurts number legibility and
is heavier — rejected for v1.)

## Where it plugs in
- **Interactive playback**: `renderWasmFrame(t)` in index.html already poses each
  ball per frame. Restructure the ball's inner content into a clipped SVG "face"
  (number + pip group); each frame, set the pip transforms from the roll phase
  and heading. Accumulate per-ball `rollPhase` and `distance` across frames.
- **At rest**: pips settle to a static arrangement (no motion) — balls look
  normal when not moving.
- **Print/GIF**: not a focus (stills use trails). Could add later for a
  continuous-motion GIF mode.

## Scope / MVP
**MVP:** pips on cue + numbered balls, forward-roll scroll from arclength,
during interactive playback only. ~1 evening; contained to the ball-render
code. **Then:** sidespin in-plane spin, slide-phase skid using the `spin`
event, striped-ball band scroll.

## Risks
- Readability: mitigated by keeping the number centered/upright.
- Performance: ~16 balls × a few pips × 60fps = trivial DOM/SVG work.
- Taste: the pip look is a deliberate choice — confirm before building.
