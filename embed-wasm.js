// Embeds the ace-physics wasm into index.html as base64, preserving the
// single-file, zero-build-step ethos (the app still opens with file://).
// Run after rebuilding the core:
//   cargo build --release --target wasm32-unknown-unknown   (in ace-physics/)
//   node embed-wasm.js
// Replaces the content between the ACE_WASM markers in index.html.
//
//   node embed-wasm.js --check
// Compares instead of writing: exits non-zero when the committed core is not the core this
// build produced. That comparison is only exact on the host whose bytes are canonical, which
// since 2026-10-16 is CI - the wasm's code section depends on the compiling host, measured
// 2026-10-14 (see NEXT_STEPS.md, option 2 of the embed-check menu). So --check belongs in the
// physics job; a local run is expected to report a difference and the message says how to get
// the canonical bytes.
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const check = process.argv.includes('--check')
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

if (check) {
  // Line endings are normalised on both sides: a Windows checkout has CRLF outside the block and
  // the payload is written with LF, so raw bytes would differ for identical content (the same
  // lesson verify-doc-claims.js records about index.html's size).
  const normalise = s => s.replace(/\r\n/g, '\n')
  const committed = html.match(re)[0]
  const same = normalise(committed) === normalise(payload)
  const committedB64 = (committed.match(/"([A-Za-z0-9+/=]+)"/) || [, ''])[1].length
  console.log(`built ${wasm.length} bytes wasm -> ${b64.length} base64 chars`)
  if (same) {
    console.log('ok: the committed core is the CI-built core (identical after line-ending normalisation)')
  } else {
    console.error(`FAIL: the core committed in index.html is not the core this build produced`)
    console.error(`      built here : ${wasm.length} bytes wasm -> ${b64.length} base64 chars`)
    console.error(`      committed  : ${committedB64} base64 chars`)
    console.error(`      The committed bytes come from CI now. Download the \`ci-built-core\` artifact`)
    console.error(`      from this run, then either commit its index.html or run`)
    console.error(`      \`node embed-wasm.js\` with its ace_physics.wasm in place, and commit.`)
    process.exitCode = 1
  }
} else {
  html = html.replace(re, payload)
  writeFileSync(htmlPath, html)
  console.log(`embedded ${wasm.length} bytes wasm -> ${b64.length} base64 chars into index.html`)
}
