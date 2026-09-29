// Freezes what the physics core actually does, not just whether the intended ball potted.
//
// The battery (`verify-rust-parity.js`) asserts an outcome — the right ball drops in the right
// pocket — so a retune can move paths, cushion angles and roll-out while still going 8/8. That
// already happened once: `SPIN_MAX 1.7 -> 2.3` changed every draw, and only `verify-spin.js`
// noticed. This script records the full result of a set of shots — every ball's final position
// and the event list — and compares it against a checked-in golden file.
//
// Deliberate physics change? Re-freeze and review the diff:
//   node verify-trajectories.js --update
// Then commit tests/trajectories.golden.json with the change that caused it.
//
// The verdict is printed, not returned: the wasm host aborts during process teardown on this
// node version, so `verify-core.js` judges the stdout of this script (same as the battery).

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { simulate } from './ace-physics-node.js'

const here = dirname(fileURLToPath(import.meta.url))
const goldenPath = join(here, 'tests', 'trajectories.golden.json')
const update = process.argv.includes('--update')

// Written as raw initial conditions rather than "aim at the ghost" so the fixture is
// independent of the app's aiming solver: these freeze the core, not the solver.
const SHOTS = [
  { name: 'straight-stun', cue: { x: 30, y: 25, vx: 45, vy: 0 }, object: { x: 60, y: 25 }, english: { x: 0, y: 0 } },
  { name: 'straight-follow', cue: { x: 30, y: 25, vx: 45, vy: 0 }, object: { x: 60, y: 25 }, english: { x: 0, y: -0.6 } },
  { name: 'straight-draw', cue: { x: 30, y: 25, vx: 45, vy: 0 }, object: { x: 60, y: 25 }, english: { x: 0, y: 0.7 } },
  { name: 'straight-left-english', cue: { x: 30, y: 25, vx: 45, vy: 0 }, object: { x: 60, y: 25 }, english: { x: 0.5, y: 0 } },
  { name: 'cut-to-the-right', cue: { x: 30, y: 25, vx: 42, vy: 8 }, object: { x: 60, y: 33 }, english: null },
  { name: 'cut-to-the-left', cue: { x: 30, y: 25, vx: 42, vy: -8 }, object: { x: 60, y: 17 }, english: null },
  { name: 'rail-runner', cue: { x: 20, y: 40, vx: 40, vy: 20 }, object: { x: 60, y: 14 }, english: null },
]

const round = (v, places) => Number(v.toFixed(places))

function observe(shot) {
  const result = simulate({ cue: shot.cue, '1': shot.object }, shot.english, 12)
  const final = {}
  for (const [id, ball] of Object.entries(result.final ?? {})) {
    final[id] = { x: round(ball.x, 3), y: round(ball.y, 3) }
  }
  return {
    final,
    events: (result.events ?? []).map((e) => ({
      type: e.type,
      t: round(e.t ?? 0, 3),
      // ids are absent on some event kinds; keep the shape stable for comparison
      a: e.a ?? e.id ?? null,
      b: e.b ?? null,
    })),
  }
}

const observed = {}
for (const shot of SHOTS) observed[shot.name] = observe(shot)

if (update) {
  writeFileSync(goldenPath, `${JSON.stringify(observed, null, 2)}\n`)
  console.log(`updated ${goldenPath} with ${SHOTS.length} trajectories`)
  process.exit(0)
}

let golden
try {
  golden = JSON.parse(readFileSync(goldenPath, 'utf-8'))
} catch (err) {
  console.error(`FAIL: cannot read ${goldenPath} (run with --update to create it)`)
  console.log('FAIL 0/0 trajectories match')
  process.exit(1)
}

// Tolerances: positions in table units (a ball is 2.25 wide), times in seconds.
const POS_TOL = 0.05
const TIME_TOL = 0.02

let passed = 0
for (const shot of SHOTS) {
  const want = golden[shot.name]
  const got = observed[shot.name]
  if (!want) {
    console.log(`${shot.name}: no golden entry`)
    continue
  }
  const problems = []
  const ids = new Set([...Object.keys(want.final ?? {}), ...Object.keys(got.final ?? {})])
  for (const id of ids) {
    const a = want.final?.[id]
    const b = got.final?.[id]
    if (!a || !b) {
      problems.push(`ball ${id} present in only one result`)
      continue
    }
    if (Math.abs(a.x - b.x) > POS_TOL || Math.abs(a.y - b.y) > POS_TOL) {
      problems.push(`ball ${id}: (${a.x},${a.y}) -> (${b.x},${b.y})`)
    }
  }
  if ((want.events?.length ?? 0) !== (got.events?.length ?? 0)) {
    problems.push(`events ${want.events?.length ?? 0} -> ${got.events?.length ?? 0}`)
  } else {
    (want.events ?? []).forEach((e, i) => {
      const g = got.events[i]
      if (e.type !== g.type) problems.push(`event ${i}: ${e.type} -> ${g.type}`)
      else if (Math.abs(e.t - g.t) > TIME_TOL) problems.push(`event ${i} (${e.type}): t ${e.t} -> ${g.t}`)
    })
  }
  if (problems.length) {
    console.log(`FAIL  ${shot.name}: ${problems.slice(0, 3).join('; ')}${problems.length > 3 ? ` (+${problems.length - 3} more)` : ''}`)
  } else {
    passed += 1
    console.log(`ok    ${shot.name} (${got.events.length} events)`)
  }
}

console.log(`${passed}/${SHOTS.length} trajectories match the golden file`)
process.exit(passed === SHOTS.length ? 0 : 1)
