// Node loader for the ace-physics wasm core. Wraps the raw flat-f64/JSON ABI
// (alloc_f64 + simulate_raw -> packed u64 ptr/len) in a clean simulate(balls,
// english, maxTime) -> { events, final, duration }. Single source of truth for
// every Node tool (render-impacts, Monte Carlo, parity test).
//
// Build the wasm first (zero deps, no MSVC needed):
//   cargo build --release --target wasm32-unknown-unknown   (in ace-physics/)
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Where `cargo build --release --target wasm32-unknown-unknown` puts the wasm. Exported so
// every consumer names one path (tools, checks, and the embed check that compares against it).
export const BUILT_WASM_PATH = join(__dirname, 'ace-physics', 'target', 'wasm32-unknown-unknown', 'release', 'ace_physics.wasm')

// A core from arbitrary wasm bytes — the built module by default, or the copy embedded in
// index.html (`verify-wasm-embed.js` loads both and compares their behaviour).
export function coreFromBytes(bytes) {
  return new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports
}

let exportsCache = null
function core() {
  if (!exportsCache) exportsCache = coreFromBytes(readFileSync(BUILT_WASM_PATH))
  return exportsCache
}

// balls: { id: { x, y, vx?, vy? } } with velocities in units/SEC; id 'cue' or
// a number string. english: { x, y } | null. Returns the parsed sim result.
export function simulate(balls, english = null, maxTime = 10) {
  return simulateWith(core(), balls, english, maxTime)
}

// The same call against a core the caller already loaded.
export function simulateWith(core, balls, english = null, maxTime = 10) {
  const { memory, alloc_f64, simulate_raw } = core
  const ids = Object.keys(balls)
  const input = [ids.length, maxTime, english ? 1 : 0, english?.x ?? 0, english?.y ?? 0]
  for (const id of ids) {
    const b = balls[id]
    input.push(id === 'cue' ? 0 : parseInt(id, 10), b.x, b.y, b.vx ?? 0, b.vy ?? 0)
  }
  const ptr = alloc_f64(input.length)
  new Float64Array(memory.buffer, ptr, input.length).set(input)
  const packed = simulate_raw(ptr, input.length)
  // memory.buffer may detach if alloc grew it; re-read from current buffer
  const buf = memory.buffer
  const outPtr = Number(packed >> 32n)
  const outLen = Number(packed & 0xffffffffn)
  return JSON.parse(Buffer.from(buf, outPtr, outLen).toString('utf8'))
}
