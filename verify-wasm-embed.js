// Fails when the physics core embedded in index.html does not behave like what ace-physics/
// builds.
//
// Why this exists: index.html is the artifact everyone opens - it carries the core as base64
// between the ACE_WASM markers - and nothing else notices when a core change lands without
// re-running embed-wasm.js. That exact drift was found in this repo once.
//
// Why behaviour and not bytes: this check used to compare the two modules byte-for-byte, with
// custom sections stripped. That is not a property of the source. The same tree, rebuilt on a
// different host, produced a different code section, so the check was red in CI and green here
// on the very same committed core (measured 2026-10-14; see NEXT_STEPS.md). It now loads both
// cores and runs the battery (battery-cases.js - the same inputs verify-rust-parity.js puts
// through the build) through each of them, and requires them to agree on the shot: the
// expected ball in the expected pocket with no scratch, the same events in the same order, the
// same final table, the same duration. That is what a user gets from "the embedded core is the
// build", and it travels between hosts.
//
// Not byte-identical is fine; behaving differently is not.
//
// Usage, after building the core:
//   cargo build --release --target wasm32-unknown-unknown   (in ace-physics/)
//   node verify-wasm-embed.js
// On failure: node embed-wasm.js
//
// Note on exiting: this process instantiates wasm, and on this node version process.exit()
// after that aborts during teardown (libuv UV_HANDLE_CLOSING assertion, exit 9), which would
// override the verdict - measured. So it never calls process.exit(); it sets process.exitCode
// and lets the process end on its own. verify-core.js exists for the scripts that do call it.

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { BUILT_WASM_PATH, coreFromBytes, simulateWith } from './ace-physics-node.js'
import { batteryCases, eventSummary } from './battery-cases.js'

const here = dirname(fileURLToPath(import.meta.url))

// How far apart the two cores may land before the embedded one is not the build. Positions are
// table units (1 unit = 1 inch). Measured here: two cores from the same source agree exactly
// (0.000 units), while a retune nobody could see - rail COR by 0.01% - already lands 0.05 units
// away, five times this floor. So the floor sits far above float rounding and far below the
// smallest real retune measured (see NEXT_STEPS.md); it is not a "close enough" allowance.
const POSITION_TOLERANCE = 0.01
const DURATION_TOLERANCE = 0.05 // seconds

let failed = 0
function fail(message) {
  console.error(`FAIL: ${message}`)
  failed++
}

// A module without its custom (id 0) sections: magic + version, then every other section.
// Reported for information only - the code section depends on the host that compiled the
// module, so byte equality is no longer a verdict.
function codeOnly(module) {
  const kept = [module.subarray(0, 8)]
  let at = 8
  while (at < module.length) {
    const id = module[at]
    let cursor = at + 1
    let size = 0
    let shift = 0
    let byte
    do {
      byte = module[cursor++]
      size |= (byte & 0x7f) << shift
      shift += 7
    } while (byte & 0x80)
    const end = cursor + size
    if (id !== 0) kept.push(module.subarray(at, end))
    at = end
  }
  return Buffer.concat(kept)
}

function main() {
  const html = readFileSync(join(here, 'index.html'), 'utf-8')
  const match = html.match(/ACE_PHYSICS_WASM_B64 = "([A-Za-z0-9+/=]+)"/)
  if (!match) {
    fail('no embedded core found in index.html (ACE_PHYSICS_WASM_B64)')
    return
  }
  const embeddedBytes = Buffer.from(match[1], 'base64')

  let builtBytes
  try {
    builtBytes = readFileSync(BUILT_WASM_PATH)
  } catch {
    fail(`cannot read the built core at ${BUILT_WASM_PATH}`)
    console.error('      build it first: cargo build --release --target wasm32-unknown-unknown  (in ace-physics/)')
    return
  }

  let embedded, built
  try {
    embedded = coreFromBytes(embeddedBytes)
    built = coreFromBytes(builtBytes)
  } catch (err) {
    fail(`a core did not load: ${String(err).slice(0, 120)}`)
    console.error('      if it is the embedded one: node embed-wasm.js')
    return
  }

  const cases = batteryCases()
  let maxDrift = 0
  let worstCase = null
  let maxDurationDrift = 0
  let worstDurationCase = null

  for (const c of cases) {
    const embeddedResult = simulateWith(embedded, c.balls, c.english)
    const builtResult = simulateWith(built, c.balls, c.english)

    // The battery's own claim, asserted on both sides: the intended ball drops in the
    // intended pocket, and the cue does not follow it in.
    for (const [label, result] of [['embedded', embeddedResult], ['build', builtResult]]) {
      const events = result.events ?? []
      const potted = events.some(e => e.type === 'pocket' && e.id === c.expectBall && e.pocket === c.expectPocket)
      const scratched = events.some(e => e.type === 'pocket' && e.id === 'cue')
      if (!potted || scratched) {
        fail(`${c.name}: the ${label} core did not pot ${c.expectBall} in ${c.expectPocket}${scratched ? ' (scratched)' : ''}`)
      }
    }

    const embeddedEvents = eventSummary(embeddedResult)
    const builtEvents = eventSummary(builtResult)
    if (embeddedEvents !== builtEvents) {
      fail(`${c.name}: the two cores ran different shots`)
      console.error(`      embedded: ${embeddedEvents || '(none)'}`)
      console.error(`      build:    ${builtEvents || '(none)'}`)
      continue // the tables are not comparable once the events diverge
    }

    const ids = new Set([...Object.keys(embeddedResult.final ?? {}), ...Object.keys(builtResult.final ?? {})])
    let caseDrift = 0
    for (const id of ids) {
      const a = (embeddedResult.final ?? {})[id]
      const b = (builtResult.final ?? {})[id]
      if (!a || !b) {
        fail(`${c.name}: ball ${id} is in one core's result but not the other's`)
        continue
      }
      caseDrift = Math.max(caseDrift, Math.hypot(a.x - b.x, a.y - b.y))
    }
    if (caseDrift > maxDrift) {
      maxDrift = caseDrift
      worstCase = c.name
    }
    const durationDrift = Math.abs((embeddedResult.duration ?? 0) - (builtResult.duration ?? 0))
    if (durationDrift > maxDurationDrift) {
      maxDurationDrift = durationDrift
      worstDurationCase = c.name
    }
  }

  if (maxDrift > POSITION_TOLERANCE) {
    fail(`${worstCase} lands ${maxDrift.toFixed(3)} units apart in the two cores (tolerance ${POSITION_TOLERANCE})`)
  }
  if (maxDurationDrift > DURATION_TOLERANCE) {
    fail(`${worstDurationCase} runs ${maxDurationDrift.toFixed(3)}s apart in the two cores (tolerance ${DURATION_TOLERANCE})`)
  }

  if (failed > 0) {
    console.error('      the core embedded in index.html is not the core ace-physics/ builds')
    console.error('      fix: node embed-wasm.js')
    return
  }

  console.log(`ok: the embedded core behaves like the build (${cases.length} battery cases, max position drift ${maxDrift.toFixed(3)} units${maxDrift > 0 ? ` on ${worstCase}` : ''}, max duration drift ${maxDurationDrift.toFixed(3)}s)`)
  console.log(codeOnly(embeddedBytes).equals(codeOnly(builtBytes))
    ? `info: the two modules are byte-identical as well (${builtBytes.length} bytes, custom sections stripped)`
    : `info: the modules differ in bytes (embedded ${embeddedBytes.length}, built ${builtBytes.length}) - not a verdict: the code section depends on the host that compiled it`)
}

main()
process.exitCode = failed === 0 ? 0 : 1
