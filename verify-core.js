// Runs the wasm-side checks and turns them into one trustworthy exit code.
//
// Why a wrapper: these scripts instantiate the physics wasm, and this node version aborts
// during process teardown afterwards (libuv UV_HANDLE_CLOSING assertion, exit 3221226505 =
// 0xC0000409), which overrides whatever verdict the script itself returns. So each script
// prints its verdict and this wrapper judges the text. A crash *before* a verdict still fails
// here, so nothing is hidden.
//
//   node verify-core.js

import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))

const checks = [
  { script: 'verify-rust-parity.js', verdict: /(\d+)\/(\d+) passed through the Rust core/, what: 'physics battery' },
  { script: 'verify-trajectories.js', verdict: /(\d+)\/(\d+) trajectories match the golden file/, what: 'trajectory golden' },
  // Prints a bare PASS/FAIL instead of a count. Judged here for the same reason as the two
  // above: it instantiates the wasm and then aborts during teardown, so its own exit code is
  // meaningless (it prints PASS and still exits 0xC0000409 here).
  { script: 'verify-spin.js', verdict: /^(PASS|FAIL)$/m, what: 'spin model' },
]

let failed = 0
for (const check of checks) {
  const run = spawnSync(process.execPath, [join(here, check.script)], { encoding: 'utf-8' })
  const output = `${run.stdout || ''}${run.stderr || ''}`
  process.stdout.write(output)

  const match = output.match(check.verdict)
  if (!match) {
    console.error(`FAIL: ${check.what} printed no verdict (${check.script} exited ${run.status})`)
    failed += 1
    continue
  }
  if (!/^\d+$/.test(match[1] ?? '')) {
    // a pass/fail check rather than a count
    if (match[0] !== 'PASS') {
      console.error(`FAIL: ${check.what} printed ${match[0]} (${check.script})`)
      failed += 1
    } else {
      console.log(`ok: ${check.what} PASS (${check.script} itself exited ${run.status})`)
    }
    continue
  }
  const [passed, total] = [Number(match[1]), Number(match[2])]
  if (total === 0 || passed !== total) {
    console.error(`FAIL: ${check.what} ${passed}/${total}`)
    failed += 1
  } else {
    console.log(`ok: ${check.what} ${passed}/${total} (${check.script} itself exited ${run.status})`)
  }
}

process.exit(failed === 0 ? 0 : 1)
