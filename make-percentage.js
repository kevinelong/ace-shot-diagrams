// Empirical make-percentage via Monte Carlo over the ace-physics core.
// For each shot it computes the ideal aim (cue -> ghost contact point for the
// selected ball & pocket), then fires N strokes with the aim angle perturbed
// by a Gaussian (stroke error), counting how often the target ball drops in
// the intended pocket. The core resolves a shot in microseconds, so thousands
// of trials per shot are cheap. This is what the app's heuristic make % should
// eventually be replaced by.
//
// Usage:
//   node make-percentage.js --state "v1|cue:..|1:..|p:cbr|b:1|..|f:6|.." [--n 1000] [--sigma 1.5]
//   node make-percentage.js scenarios/curriculum.json [--n 800]
//   node make-percentage.js --selftest      (asserts make% falls as cut angle rises)
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { simulate } from './ace-physics-node.js'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d }
const flag = n => args.includes(n)

const N = parseInt(opt('--n', '800'), 10)
const SIGMA_DEG = parseFloat(opt('--sigma', '1.5'))   // aim error std dev (degrees)
const SEED = parseInt(opt('--seed', '12345'), 10)

const POCKETS = {
  'corner-tl': { x: 1.5, y: 1.5 }, 'corner-tr': { x: 98.5, y: 1.5 },
  'corner-bl': { x: 1.5, y: 48.5 }, 'corner-br': { x: 98.5, y: 48.5 },
  'side-top': { x: 50, y: 0 }, 'side-bottom': { x: 50, y: 50 },
}
const BALL_D = 2.25

// seeded PRNG (mulberry32) + Box-Muller so runs are reproducible
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function gauss(rng) {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function parseState(state) {
  const out = { balls: {}, english: { x: 0, y: 0 } }
  for (const part of state.split('|')) {
    if (part.startsWith('p:')) out.pocket = part.slice(2).replace(/^c/, 'corner-').replace(/^s/, 'side-')
    else if (part.startsWith('b:')) out.target = part.slice(2)
    else if (part.startsWith('f:')) out.force = parseFloat(part.slice(2))
    else if (part.startsWith('e:')) { const [x, y] = part.slice(2).split(',').map(parseFloat); out.english = { x, y } }
    else if (part.startsWith('a:') || part.startsWith('m:') || part.startsWith('s:') || part.startsWith('v')) continue
    else if (part.includes(':')) { const [id, c] = part.split(':'); const [x, y] = c.split(',').map(parseFloat); out.balls[id] = { x, y } }
  }
  return out
}

// returns { make, scratch, other } percentages, or null if the shot is under-specified
function makePercentage(state, n = N, sigma = SIGMA_DEG, seed = SEED) {
  const s = parseState(state)
  if (!s.target || !s.pocket || !s.balls.cue || !s.balls[s.target]) return null
  const ob = s.balls[s.target]
  const pk = POCKETS[s.pocket]
  const pd = Math.hypot(pk.x - ob.x, pk.y - ob.y)
  const ghost = { x: ob.x - (pk.x - ob.x) / pd * BALL_D, y: ob.y - (pk.y - ob.y) / pd * BALL_D }
  const cue = s.balls.cue
  const baseAngle = Math.atan2(ghost.y - cue.y, ghost.x - cue.x)
  const speed = (s.force ?? 6) * 0.75 * 60
  const sigmaRad = sigma * Math.PI / 180
  const rng = mulberry32(seed)

  let make = 0, scratch = 0
  for (let i = 0; i < n; i++) {
    const ang = baseAngle + gauss(rng) * sigmaRad
    const balls = {}
    for (const [id, b] of Object.entries(s.balls)) {
      balls[id] = id === 'cue'
        ? { x: b.x, y: b.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed }
        : { x: b.x, y: b.y }
    }
    const r = simulate(balls, s.english)
    const pocketed = r.events.filter(e => e.type === 'pocket')
    if (pocketed.some(e => e.id === 'cue')) scratch++
    else if (pocketed.some(e => e.id === s.target && e.pocket === s.pocket)) make++
  }
  return { make: make / n * 100, scratch: scratch / n * 100, n }
}

// ---- self-test: make% must fall as cut angle grows ----
if (flag('--selftest')) {
  // 1-ball fixed on the foot spot to corner-br; cue swung around to widen the cut
  const ob = { x: 75, y: 25 }, pk = POCKETS['corner-br']
  const pd = Math.hypot(pk.x - ob.x, pk.y - ob.y)
  const aim = { x: ob.x - (pk.x - ob.x) / pd * BALL_D, y: ob.y - (pk.y - ob.y) / pd * BALL_D }
  const baseAim = Math.atan2(pk.y - ob.y, pk.x - ob.x)
  const rows = []
  for (const cut of [0, 15, 30, 45, 60]) {
    // place cue 18 units from the ghost, rotated `cut` degrees off the pocket line
    const dir = baseAim + Math.PI + cut * Math.PI / 180
    const cue = { x: aim.x + Math.cos(dir) * 18, y: aim.y + Math.sin(dir) * 18 }
    if (cue.x < 4 || cue.x > 96 || cue.y < 4 || cue.y > 46) { console.log(`cut ${cut}°: cue off table (${cue.x.toFixed(1)},${cue.y.toFixed(1)}) - skipped`); continue }
    const state = `v1|cue:${cue.x.toFixed(1)},${cue.y.toFixed(1)}|1:75,25|p:cbr|b:1|f:6|e:0.0,0.0`
    const r = makePercentage(state, 600)
    rows.push({ cut, ...r })
    console.log(`cut ${String(cut).padStart(2)}°:  make ${r.make.toFixed(1)}%   scratch ${r.scratch.toFixed(1)}%`)
  }
  let monotonic = true
  for (let i = 1; i < rows.length; i++) if (rows[i].make > rows[i - 1].make + 8) monotonic = false
  console.log(`\nmonotonic-ish decrease: ${monotonic ? 'PASS' : 'FAIL'}; straight-in > thin: ${rows[0].make > rows[rows.length - 1].make ? 'PASS' : 'FAIL'}`)
  process.exit(monotonic && rows[0].make > rows[rows.length - 1].make ? 0 : 1)
}

// ---- normal run ----
let scenarios
if (opt('--state')) scenarios = [{ name: opt('--name', 'shot'), state: opt('--state') }]
else {
  const p = args.find(a => !a.startsWith('--') && a !== opt('--n') && a !== opt('--sigma') && a !== opt('--seed'))
  if (!p) { console.error('Usage: node make-percentage.js --state "<state>" | <scenarios.json> [--n 800] [--sigma 1.5]'); process.exit(1) }
  scenarios = JSON.parse(readFileSync(resolve(p), 'utf-8'))
}

console.log(`Monte Carlo make % (n=${N}, aim sigma=${SIGMA_DEG}°)`)
console.log(`note: uses direct ghost-ball aim; kick/bank/combo need the solver's aim and will read low\n`)
for (const sc of scenarios) {
  const r = makePercentage(sc.state)
  if (!r) { console.log(`${(sc.name ?? 'shot').padEnd(28)} (no target/pocket - skipped)`); continue }
  const bar = '#'.repeat(Math.round(r.make / 5)).padEnd(20)
  console.log(`${(sc.name ?? 'shot').padEnd(28)} ${bar} ${r.make.toFixed(1)}%  (scratch ${r.scratch.toFixed(1)}%)`)
}

export { makePercentage }
