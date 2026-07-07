// Sim/solver consistency battery: every shot in tests/battery.json is one
// the analytic solver rates makeable; this harness runs each through the
// real physics and asserts the intended ball drops in the intended pocket.
// Failures mean the simulation contradicts what the app tells the player.
import { chromium } from 'playwright-core'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href
const battery = JSON.parse(readFileSync(join(__dirname, 'tests', 'battery.json'), 'utf-8'))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext()
await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'))
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', e => pageErrors.push(String(e)))
await page.setViewportSize({ width: 1400, height: 900 })

let passed = 0
const failures = []
for (const c of battery) {
  await page.goto(`${indexUrl}?empty=1&r=${c.name}#${c.state}`, { waitUntil: 'load' })
  await page.waitForSelector('#pool-table-svg')
  await page.waitForTimeout(1200)
  await page.evaluate(() => document.getElementById('btnShoot').click())
  await page.waitForFunction(() => window.ACE_SHOT && window.ACE_SHOT.done, null, { timeout: 20000 })
  const shot = await page.evaluate(() => window.ACE_SHOT)

  const pocketEvent = shot.events.find(e => e.type === 'pocket' && e.id === c.expectBall)
  const scratched = shot.events.some(e => e.type === 'pocket' && e.id === 'cue')
  let ok
  if (c.expectHit) {
    // contact-only assertion (e.g. kick shots: solver promises a hit, not a make)
    ok = shot.events.some(e => e.type === 'ball-ball' &&
      c.expectHit.every(id => e.ids.includes(id))) && !scratched
  } else {
    ok = pocketEvent && pocketEvent.pocket === c.expectPocket && !scratched
  }

  if (ok) {
    passed++
    console.log(`PASS  ${c.name}`)
  } else {
    const summary = shot.events.map(e =>
      e.type === 'pocket' ? `pocket(${e.id}@${e.pocket})`
        : e.type === 'rail' ? `rail(${e.id}:${e.rail})`
        : e.type === 'ball-ball' ? `hit(${e.ids.join('>')})`
        : e.type).join(' ')
    failures.push(c.name)
    console.log(`FAIL  ${c.name}${scratched ? ' [SCRATCH]' : ''}`)
    console.log(`      expected ${c.expectHit ? `contact ${c.expectHit.join('+')}` : `${c.expectBall} -> ${c.expectPocket}`}`)
    console.log(`      events: ${summary || '(none)'}`)
  }
}

await browser.close()
console.log(`\n${passed}/${battery.length} passed${pageErrors.length ? `; PAGE ERRORS: ${pageErrors.join(' | ')}` : ''}`)
process.exit(passed === battery.length && pageErrors.length === 0 ? 0 : 1)
