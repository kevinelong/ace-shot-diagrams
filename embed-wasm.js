// Embeds the ace-physics wasm into index.html as base64, preserving the
// single-file, zero-build-step ethos (the app still opens with file://).
// Run after rebuilding the core:
//   cargo build --release --target wasm32-unknown-unknown   (in ace-physics/)
//   node embed-wasm.js
// Replaces the content between the ACE_WASM markers in index.html.
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const wasm = readFileSync(join(__dirname, 'ace-physics', 'target', 'wasm32-unknown-unknown', 'release', 'ace_physics.wasm'))
const b64 = wasm.toString('base64')

const htmlPath = join(__dirname, 'index.html')
let html = readFileSync(htmlPath, 'utf-8')

const begin = '/* ACE_WASM_BEGIN */'
const end = '/* ACE_WASM_END */'
const payload = `${begin}\n      window.ACE_PHYSICS_WASM_B64 = "${b64}";\n      ${end}`

const re = new RegExp(`${begin.replace(/[*]/g, '\\*')}[\\s\\S]*?${end.replace(/[*]/g, '\\*')}`)
if (!re.test(html)) {
  console.error('ACE_WASM markers not found in index.html — add the placeholder script block first.')
  process.exit(1)
}
html = html.replace(re, payload)
writeFileSync(htmlPath, html)
console.log(`embedded ${wasm.length} bytes wasm -> ${b64.length} base64 chars into index.html`)
