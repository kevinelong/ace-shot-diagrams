// Guards the two habits that cost this repo the most: fixed waits creeping back into the specs,
// and assertions that cannot fail.
//
// A deliberate fixed wait must say why. Put `hygiene-allow` in a comment on the same line or the
// line above and give a reason; the three timing gaps in "recalculate instantly without lag" do
// exactly that, because there the wait *is* the measurement. Everything else must wait on the
// app's own state - see the notes in tests/setup/test-helpers.ts for the ones that were removed.
//
// A `toBeGreaterThanOrEqual(0)` on something that came from `.count()` can never fail (a locator
// count is never negative), so it is flagged as a vacuous assertion. Comparing a real geometry
// value with `>= 0` is fine and not flagged.
//
//   node verify-test-hygiene.js

import { readFileSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const MARKER = 'hygiene-allow'
const files = readdirSync(join(here, 'tests'), { recursive: true })
  .map(f => String(f)).filter(f => f.endsWith('.ts')).map(f => join(here, 'tests', f))

let problems = 0
for (const file of files) {
  const lines = readFileSync(file, 'utf-8').split('\n')
  const rel = file.slice(here.length + 1).replace(/\\/g, '/')
  lines.forEach((line, i) => {
    const marked = line.includes(MARKER) || (lines[i - 1] || '').includes(MARKER)
    const near = (n) => (lines[i - 1] || '').includes(n) || (lines[i - 2] || '').includes(n)

    if (line.includes('waitForTimeout(') && !marked) {
      console.error(`${rel}:${i + 1}: fixed wait without a reason - wait on app state, or add a "${MARKER} <why>" comment`)
      problems += 1
    }
    if (line.includes('toBeGreaterThanOrEqual(0)') && !marked && near('.count()')) {
      console.error(`${rel}:${i + 1}: a locator count is never negative, so this cannot fail`)
      problems += 1
    }
    if (/expect\(\s*true\s*\)/.test(line) && !marked) {
      console.error(`${rel}:${i + 1}: expect(true) asserts nothing`)
      problems += 1
    }
  })
}

if (problems) {
  console.error(`\n${problems} test-hygiene problem(s) across ${files.length} files`)
  process.exit(1)
}
console.log(`ok: no fixed waits without a reason and no vacuous assertions across ${files.length} test files`)
