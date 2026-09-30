// Checks the live claims the docs make about the repo.
//
// Five claims drifted in a single pass (a suite total, a file size, a template version, a
// browser-path note, and what CI was said to run), because docs asserting numbers have nothing
// tying them to reality. Only mechanically checkable claims belong here - counts, versions, and
// the test tree - never prose. Historical measurements (a run's wall time, "before" figures)
// are deliberately out of scope: they were true when recorded.
//
//   node verify-doc-claims.js

import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { execFileSync } from 'child_process'
import { dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const here = dirname(fileURLToPath(import.meta.url))
const read = (f) => readFileSync(join(here, f), 'utf-8')
let failed = 0

function check(what, ok, detail) {
  if (ok) { console.log(`ok: ${what}`); return }
  console.error(`FAIL: ${what} - ${detail}`)
  failed += 1
}

// ── the suite total, as the config comment claims it ──
let suiteTotal = null, suiteFiles = null
try {
  const out = execFileSync(process.execPath,
    [require.resolve('@playwright/test/cli'), 'test', '--list', '--project=chromium'],
    { encoding: 'utf-8', cwd: here })
  const m = out.match(/Total: (\d+) tests in (\d+) files/)
  if (m) { suiteTotal = Number(m[1]); suiteFiles = Number(m[2]) }
} catch (e) {
  check('playwright --list runs', false, String(e).slice(0, 120))
}
if (suiteTotal !== null) {
  const cfg = read('playwright.config.ts').match(/the suite is (\d+) tests/)
  check('playwright.config.ts states the real suite total',
    cfg && Number(cfg[1]) === suiteTotal,
    `config says ${cfg ? cfg[1] : '(nothing)'}, the suite has ${suiteTotal}`)
}

// ── the test tree in tests/README.md ──
const treeBlock = (read('tests/README.md').match(/## Test Structure[\s\S]*?```([\s\S]*?)```/) || [])[1] || ''
const treeNames = [...treeBlock.matchAll(/([\w-]+\.spec\.ts)/g)].map(m => m[1]).sort()
const realNames = readdirSync(join(here, 'tests'), { recursive: true })
  .filter(f => String(f).endsWith('.spec.ts')).map(f => basename(String(f))).sort()
check('tests/README.md lists exactly the spec files that exist',
  treeNames.join(',') === realNames.join(','),
  `README: ${treeNames.join(' ')} | real: ${realNames.join(' ')}`)

// ── index.html's size, as the plan's reference records it ──
const html = read('index.html')
const lines = (html.match(/\n/g) || []).length
const kb = Math.round(statSync(join(here, 'index.html')).size / 1024)
const claim = read('NEXT_STEPS.md').match(/`index\.html` \*\*(\d+) lines \/ (\d+) KB\*\*/)
check('NEXT_STEPS.md records index.html\'s real size',
  claim && Number(claim[1]) === lines && Math.abs(Number(claim[2]) - kb) <= 2,
  `plan says ${claim ? `${claim[1]} lines / ${claim[2]} KB` : '(nothing)'}, actual ${lines} lines / ${kb} KB`)

// ── the template version, as claude.md claims it ──
const versions = readdirSync(join(here, 'versions')).filter(f => /^pool-table-v\d+\.svg$/.test(f)).sort()
const newest = versions.length ? versions[versions.length - 1].match(/v(\d+)/)[1] : null
const claudeVersions = [...read('claude.md').matchAll(/\(v(\d{3})\)/g)].map(m => m[1])
check('claude.md names the newest tracked template version',
  newest !== null && claudeVersions.length > 0 && claudeVersions.every(v => Number(v) === Number(newest)),
  `claude.md says ${claudeVersions.join('/')}, versions/ holds up to ${newest}`)

// ── stale strings that were corrected and must not come back ──
for (const [file, forbidden] of [
  ['playwright.config.ts', '76/76'],
  ['tests/README.md', 'file:// (default)'],
  ['claude.md', 'has native unit tests but needs MSVC'],
]) {
  check(`${file} does not carry the corrected claim "${forbidden}"`,
    !read(file).includes(forbidden),
    'the stale string is back')
}

// ── docs that must exist and must not pretend to be a to-do list ──
for (const f of ['PLAYWRIGHT_TEST_PLAN.md', 'GAME_MODE_PLAN.md']) {
  check(`${f} is marked historical`,
    existsSync(join(here, f)) && read(f).includes('Historical - superseded'),
    'missing, or not marked historical')
}

if (failed) {
  console.error(`\n${failed} doc claim(s) are wrong`)
  process.exit(1)
}
console.log('\nall doc claims match reality')
