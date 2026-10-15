// The battery inputs, built once for every check that puts them through a core.
//
// `tests/battery.json` holds diagrams, not shots: the cue velocity has to be derived by aiming
// at the throw-compensated ghost ball, exactly as the app does. That derivation used to live
// only in `verify-rust-parity.js` (the build); `verify-wasm-embed.js` now runs the same battery
// through the *embedded* core, so both read it from here - otherwise the two copies would
// drift and the embed check would compare different shots than the parity check.
//
// Kick cases (expectHit) are left out: their aim comes from the JS solver, not from geometry
// derivable here.

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const battery = JSON.parse(readFileSync(join(here, 'tests', 'battery.json'), 'utf-8'))

const POCKETS = {
  'corner-tl': { x: 1.5, y: 1.5 }, 'corner-tr': { x: 98.5, y: 1.5 },
  'corner-bl': { x: 1.5, y: 48.5 }, 'corner-br': { x: 98.5, y: 48.5 },
  'side-top': { x: 50, y: 0 }, 'side-bottom': { x: 50, y: 50 },
}
const BALL_D = 2.25
const THROW_MU = 0.06

function parseState(state) {
  const out = { balls: {}, english: { x: 0, y: 0 } }
  for (const part of state.split('|')) {
    if (part.startsWith('p:')) out.pocket = part.slice(2).replace(/^c/, 'corner-').replace(/^s/, 'side-')
    else if (part.startsWith('b:')) out.target = part.slice(2)
    else if (part.startsWith('f:')) out.force = parseFloat(part.slice(2))
    else if (part.startsWith('e:')) { const [x, y] = part.slice(2).split(',').map(parseFloat); out.english = { x, y } }
    else if (part.startsWith('a:') || part.startsWith('m:') || part.startsWith('s:') || part.startsWith('v')) continue
    else if (part.includes(':')) {
      const [id, coords] = part.split(':')
      const [x, y] = coords.split(',').map(parseFloat)
      out.balls[id] = { x, y }
    }
  }
  return out
}

// pre-rotate the OB->pocket aim by the predicted collision-induced throw so the
// ball still arrives at the pocket (same correction as index.html)
function throwCompensatedDir(cue, ob, objToPocket) {
  const contact = { x: ob.x - objToPocket.x * BALL_D, y: ob.y - objToPocket.y * BALL_D }
  const al = Math.hypot(contact.x - cue.x, contact.y - cue.y) || 1
  const ap = { x: (contact.x - cue.x) / al, y: (contact.y - cue.y) / al }
  const d = objToPocket
  const cosT = Math.max(ap.x * d.x + ap.y * d.y, 1e-6)
  const sinT = ap.x * d.y - ap.y * d.x
  const phi = Math.atan(Math.min(THROW_MU, 0.5 * Math.abs(sinT) / cosT))
  const a = phi * Math.sign(sinT)
  const ca = Math.cos(a), sa = Math.sin(a)
  return { x: d.x * ca - d.y * sa, y: d.x * sa + d.y * ca }
}

// Every runnable battery case as { name, balls, english, expectBall, expectPocket }, with the
// cue's launch velocity already set (force * 0.75 units/step = *45 units/sec).
export function batteryCases() {
  const cases = []
  for (const c of battery) {
    if (c.expectHit) continue // kick aim comes from the JS solver
    const s = parseState(c.state)
    const ob = s.balls[c.expectBall]
    const pk = POCKETS[c.expectPocket]
    const pd = Math.hypot(pk.x - ob.x, pk.y - ob.y)
    const cue = s.balls.cue
    const aim = throwCompensatedDir(cue, ob, { x: (pk.x - ob.x) / pd, y: (pk.y - ob.y) / pd })
    const ghost = { x: ob.x - aim.x * BALL_D, y: ob.y - aim.y * BALL_D }
    const ad = Math.hypot(ghost.x - cue.x, ghost.y - cue.y)
    const speed = s.force * 0.75 * 60 // units/sec
    const balls = Object.fromEntries(Object.entries(s.balls).map(([id, b]) =>
      id === 'cue'
        ? [id, { ...b, vx: (ghost.x - cue.x) / ad * speed, vy: (ghost.y - cue.y) / ad * speed }]
        : [id, { ...b }]))
    cases.push({
      name: c.name, balls, english: s.english,
      expectBall: c.expectBall, expectPocket: c.expectPocket,
    })
  }
  return cases
}

// One line describing what a core did — the printer both checks report drift with.
export function eventSummary(result) {
  return (result.events ?? []).map(e =>
    e.type === 'pocket' ? `pocket(${e.id}@${e.pocket})`
      : e.type === 'rail' ? `rail(${e.id}:${e.rail})`
      : e.type === 'ball-ball' ? `hit(${(e.ids || []).join('+')})`
      : `${e.type}(${e.id ?? ''})`).join(' ')
}
