// Runs the app-side harnesses and turns them into one trustworthy exit code.
//
// Same reason as verify-core.js: these print their verdict as text and their exit code is not
// the verdict (the ones that instantiate the wasm abort in libuv teardown; a crashed page can
// still exit 0). Each entry names the text that counts as a verdict, so a crash that happens
// *before* a verdict still fails here - nothing is hidden by judging the output.
//
// Until 2026-09-29 these five could not run on Windows at all (a hardcoded /usr/bin chromium),
// which is why ci.yml listed them as deliberately excluded. Both blockers it named are gone:
// the browser lookup is portable and verify-spin.js is green.
//
//   node verify-app.js

import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))

const checks = [
  { script: 'verify-shots.cjs', verdict: /(\d+)\/(\d+) shots potted as intended/, what: 'app shots (Shoot -> pot)' },
  { script: 'verify-consistency.js', verdict: /(\d+)\/(\d+) passed/, what: 'the core through the app' },
  { script: 'verify-sim-make.js', verdict: /^(PASS|FAIL)$/m, what: 'make-% Monte Carlo' },
  { script: 'verify-animation.js', verdict: /^(PASS|FAIL)$/m, what: 'break animation' },
  { script: 'verify-ux-fixes.js', verdict: /^(PASS|FAIL)$/m, what: 'UX fixes' },
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
    // a pass/fail harness rather than a count
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

if (failed) {
  console.error(`\n${failed} of ${checks.length} app-side checks failed`)
  process.exit(1)
}
console.log(`\nall ${checks.length} app-side checks passed`)
