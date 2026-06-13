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
const wasmPath = join(__dirname, 'ace-physics', 'target', 'wasm32-unknown-unknown', 'release', 'ace_physics.wasm')

let exportsCache = null
function core() {
  if (!exportsCache) {
    const mod = new WebAssembly.Module(readFileSync(wasmPath))
    exportsCache = new WebAssembly.Instance(mod, {}).exports
  }
  return exportsCache
}

// balls: { id: { x, y, vx?, vy? } } with velocities in units/SEC; id 'cue' or
// a number string. english: { x, y } | null. Returns the parsed sim result.
export function simulate(balls, english = null, maxTime = 10) {
  const { memory, alloc_f64, simulate_raw } = core()
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
