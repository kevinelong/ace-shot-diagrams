// Fails when the physics core embedded in index.html is not what ace-physics/ builds.
//
// Why this exists: index.html is the artifact everyone opens — it carries the core as
// base64 between the ACE_WASM markers, and nothing else notices when a core change lands
// without re-running embed-wasm.js. That exact drift was found in this repo.
//
// Custom (id 0) sections are stripped before the comparison. They carry the build path and
// producer strings, so a byte-for-byte compare would fail for anyone who builds in a
// different directory. Code, data and type sections still have to match exactly.
//
// Usage, after building the core:
//   cargo build --release --target wasm32-unknown-unknown   (in ace-physics/)
//   node verify-wasm-embed.js
// On failure: node embed-wasm.js

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const htmlPath = join(here, 'index.html')
const wasmPath = join(here, 'ace-physics', 'target', 'wasm32-unknown-unknown', 'release', 'ace_physics.wasm')

const html = readFileSync(htmlPath, 'utf-8')
const match = html.match(/ACE_PHYSICS_WASM_B64 = "([A-Za-z0-9+/=]+)"/)
if (!match) {
  console.error('FAIL: no embedded core found in index.html (ACE_PHYSICS_WASM_B64)')
  process.exit(1)
}

let fresh
try {
  fresh = readFileSync(wasmPath)
} catch (err) {
  console.error(`FAIL: cannot read the built core at ${wasmPath}`)
  console.error('      build it first: cargo build --release --target wasm32-unknown-unknown  (in ace-physics/)')
  process.exit(1)
}

const embedded = Buffer.from(match[1], 'base64')

// Rebuild a module without its custom sections: magic + version, then every non-id-0 section.
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

const a = codeOnly(embedded)
const b = codeOnly(fresh)

if (!a.equals(b)) {
  console.error('FAIL: the core embedded in index.html is not the current build')
  console.error(`      embedded ${embedded.length} bytes (code ${a.length}), built ${fresh.length} bytes (code ${b.length})`)
  console.error('      fix: node embed-wasm.js')
  process.exit(1)
}

console.log(`ok: embedded core matches the current build (${fresh.length} bytes, code ${b.length})`)
