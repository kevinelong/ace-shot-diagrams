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
import { simulate } from './ace-physics-node.js'
import { batteryCases, eventSummary } from './battery-cases.js'

// The battery inputs (state parsing, the throw-compensated aim, the cue's launch velocity)
// live in battery-cases.js, because verify-wasm-embed.js now runs this same battery through
// the core embedded in index.html — one copy, so the two checks cannot compare different shots.
const cases = batteryCases()

let passed = 0
const ran = cases.length
for (const c of cases) {
  const result = simulate(c.balls, c.english)
  const pocketEvent = result.events.find(e => e.type === 'pocket' && e.id === c.expectBall)
  const scratched = result.events.some(e => e.type === 'pocket' && e.id === 'cue')
  if (pocketEvent && pocketEvent.pocket === c.expectPocket && !scratched) {
    passed++
    console.log(`PASS  ${c.name}  (${result.events.length} events, ${result.duration.toFixed(2)}s sim time)`)
  } else {
    console.log(`FAIL  ${c.name}${scratched ? ' [SCRATCH]' : ''}`)
    console.log(`      events: ${eventSummary(result) || '(none)'}`)
    console.log(`      final ${c.expectBall}: ${JSON.stringify(result.final[c.expectBall])}`)
  }
}

console.log(`\n${passed}/${ran} passed through the Rust core`)
// Verdict and exit code both matter here; verify-core.js judges the text because this
// process instantiates wasm and then calls process.exit(), which aborts during teardown on
// this node version (0xC0000409) - see the note in verify-wasm-embed.js, which cannot afford it.
process.exit(passed === ran ? 0 : 1)
