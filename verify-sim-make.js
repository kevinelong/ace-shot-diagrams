// Verifies the live Sim % (Monte Carlo make-percentage) field in the app:
// it must populate from the embedded core and read higher for an easy shot
// than a hard one.
//
// The "easy" fixture is a straight pot to a side pocket with DRAW english. It used
// to ask for the same pot with centre english, which makes the cue a rolling ball
// that follows straight into the very pocket it is aiming at; the app counts a
// scratch as a miss (`updateMakePercentage`: `if (pocketed.some(e => e.id === 'cue'))
// continue; // scratch = miss`), so it reported 51% - correct for that shot, which is
// not an easy one. With draw the cue pulls back and the same pot reports 100%. The
// assertions below are unchanged.
import { chromium } from 'playwright-core'
import { join, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href

// CHROMIUM_PATH wins when set (a system browser); otherwise playwright-core uses the
// browser it manages. The old default of '/usr/bin/chromium' made these Linux-only.
const launchOptions = { args: ['--no-sandbox', '--disable-gpu'] }
if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH
const browser = await chromium.launch(launchOptions)
const context = await browser.newContext()
await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'))
const page = await context.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.setViewportSize({ width: 1400, height: 900 })

async function simPct(state) {
  await page.goto(`${indexUrl}?empty=1&r=${Math.abs(hash(state))}#${state}`, { waitUntil: 'load' })
  await page.waitForSelector('#pool-table-svg')
  // wait for the debounced sim to write a percentage
  await page.waitForFunction(() => {
    const els = [...document.querySelectorAll('#makeProbabilityDisplay')]
    return els.some(e => /\d+%/.test(e.textContent))
  }, null, { timeout: 8000 }).catch(() => {})
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('#makeProbabilityDisplay')]
    const hit = els.map(e => e.textContent).find(t => /\d+%/.test(t))
    return hit ? parseInt(hit, 10) : null
  })
}
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h }

const easy = await simPct('v1|cue:50,30|1:50,12|p:stop|b:1|m:9ball|f:4|e:0.0,0.5|s:auto')
const hard = await simPct('v1|cue:62.9,4.3|1:70,30|p:cbr|b:1|m:9ball|f:7|e:0.0,0.0|s:auto')

console.log(`easy straight-in side: ${easy}%`)
console.log(`hard 45° cut corner:   ${hard}%`)

await browser.close()

const ok = errors.length === 0 && easy !== null && hard !== null && easy > hard && easy >= 60
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`)
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
