// Runs the Phase-1 battery through the Rust/WASM event-driven physics core
// (ace-physics) and asserts the same outcomes the JS simulation must produce:
// the intended ball drops in the intended pocket. The harness replicates the
// app's aiming (cue velocity toward the true contact ghost at force*0.75
// units/step = *45 units/sec). Kick cases (expectHit) are skipped: their aim
// comes from the JS solver, not from geometry derivable here.
//
// Build first:  cargo build --release --target wasm32-unknown-unknown
// (in ace-physics/; zero deps, links with bundled rust-lld, no MSVC needed)
//
// wasm ABI: alloc_f64(n) -> ptr; write input floats; simulate_raw(ptr, len)
// -> packed u64 (ptr<<32 | len) of a UTF-8 JSON result in wasm memory.
// Input layout: [n_balls, max_time, has_english, ex, ey,
//                then per ball: id_code, x, y, vx, vy]  (id 0 = cue)
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { simulate } from './ace-physics-node.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const battery = JSON.parse(readFileSync(join(__dirname, 'tests', 'battery.json'), 'utf-8'))

const POCKETS = {
  'corner-tl': { x: 1.5, y: 1.5 }, 'corner-tr': { x: 98.5, y: 1.5 },
  'corner-bl': { x: 1.5, y: 48.5 }, 'corner-br': { x: 98.5, y: 48.5 },
  'side-top': { x: 50, y: 0 }, 'side-bottom': { x: 50, y: 50 },
}
const BALL_D = 2.25

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

const THROW_MU = 0.06
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

let passed = 0, ran = 0
for (const c of battery) {
  if (c.expectHit) continue // kick aim comes from the JS solver
  ran++
  const s = parseState(c.state)
  const ob = s.balls[c.expectBall]
  const pk = POCKETS[c.expectPocket]
  const pd = Math.hypot(pk.x - ob.x, pk.y - ob.y)
  const cue = s.balls.cue
  // throw-compensated aim — mirrors throwCompensatedAimDir() in index.html so the
  // geometric aim accounts for collision-induced throw (MU_BALL in the core)
  const aim = throwCompensatedDir(cue, ob, { x: (pk.x - ob.x) / pd, y: (pk.y - ob.y) / pd })
  const ghost = { x: ob.x - aim.x * BALL_D, y: ob.y - aim.y * BALL_D }
  const ad = Math.hypot(ghost.x - cue.x, ghost.y - cue.y)
  const speed = s.force * 0.75 * 60 // units/sec
  const balls = Object.fromEntries(Object.entries(s.balls).map(([id, b]) =>
    id === 'cue'
      ? [id, { ...b, vx: (ghost.x - cue.x) / ad * speed, vy: (ghost.y - cue.y) / ad * speed }]
      : [id, { ...b }]))

  const result = simulate(balls, s.english)
  const pocketEvent = result.events.find(e => e.type === 'pocket' && e.id === c.expectBall)
  const scratched = result.events.some(e => e.type === 'pocket' && e.id === 'cue')
  if (pocketEvent && pocketEvent.pocket === c.expectPocket && !scratched) {
    passed++
    console.log(`PASS  ${c.name}  (${result.events.length} events, ${result.duration.toFixed(2)}s sim time)`)
  } else {
    const summary = result.events.map(e =>
      e.type === 'pocket' ? `pocket(${e.id}@${e.pocket})`
        : e.type === 'rail' ? `rail(${e.id}:${e.rail})`
        : e.type === 'ball-ball' ? `hit(${(e.ids || []).join('+')})`
        : `${e.type}(${e.id ?? ''})`).join(' ')
    console.log(`FAIL  ${c.name}${scratched ? ' [SCRATCH]' : ''}`)
    console.log(`      events: ${summary || '(none)'}`)
    console.log(`      final ${c.expectBall}: ${JSON.stringify(result.final[c.expectBall])}`)
  }
}

console.log(`\n${passed}/${ran} passed through the Rust core`)
process.exit(passed === ran ? 0 : 1)
