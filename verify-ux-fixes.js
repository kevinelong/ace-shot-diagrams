// Verifies UX fixes headlessly.
//  #1 Shot Info panel visible by default and its fields populate.
//  #3 A shared state link does NOT auto-rack (only configured balls present).
//  #2 A ball can be dragged out of the rack onto the table.
import { chromium } from '@playwright/test'
import { join, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href

const browser = await chromium.launch()
const context = await browser.newContext()
await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'))
const page = await context.newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e)))
const killTour = () => page.evaluate(() => {
  for (const id of ['tourTooltip', 'tourOverlay', 'tourSpotlight']) {
    const el = document.getElementById(id); if (el) { el.style.display = 'none'; el.style.pointerEvents = 'none' }
  }
})

const results = {}

// ---- #1 + #3: shared link shows the panel AND only the configured balls ----
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(`${indexUrl}#v1|cue:32,34|1:66,28|p:cbr|b:1|m:9ball|f:6|e:0.0,0.0|s:auto`, { waitUntil: 'load' })
await page.waitForTimeout(1500); await killTour()

results.shotPanelVisible = await page.evaluate(() => {
  const el = document.getElementById('palette-shot')
  if (!el) return false
  const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
  return cs.display !== 'none' && r.width > 0 && r.height > 0
})
results.fields = await page.evaluate(() => {
  const txt = id => document.getElementById('palette-shot')?.querySelector('#' + id)?.textContent
  // cut/shot-type are not duplicated now; read directly
  const direct = id => document.getElementById(id)?.textContent
  return {
    cut: direct('cutAngleDisplay-palette'),
    make: txt('makeProbabilityDisplay'),
    sim: txt('simMakeDisplay'),
  }
})
// exclude the ghost/aim ball; should be exactly cue + 1 (no rack)
results.ballsOnTable = await page.evaluate(() =>
  [...document.querySelectorAll('#tableWrapper .ball.on-table')]
    .filter(b => b.dataset.ballId !== 'ghost').length)
await page.screenshot({ path: join(__dirname, 'ux-shots', 'fix-01-03-sharedlink.png') })

// ---- #2: drag a ball out of the rack ----
await page.goto(`${indexUrl}?empty=1&r=drag`, { waitUntil: 'load' })
await page.waitForSelector('#pool-table-svg'); await page.waitForTimeout(700); await killTour()
const table = await page.locator('#pool-table-svg').boundingBox()
const src = await page.locator('#palette-balls #ball-1').boundingBox()
if (src) {
  const sx = src.x + src.width / 2, sy = src.y + src.height / 2
  const dx = table.x + table.width * 0.5, dy = table.y + table.height * 0.5
  await page.mouse.move(sx, sy); await page.mouse.down()
  await page.mouse.move((sx + dx) / 2, (sy + dy) / 2, { steps: 12 })
  await page.mouse.move(dx, dy, { steps: 12 }); await page.mouse.up()
  await page.waitForTimeout(400)
}
results.dragOntoTable = await page.evaluate(() =>
  !!document.getElementById('ball-1')?.classList.contains('on-table'))

await browser.close()

console.log(JSON.stringify(results, null, 1))
console.log('page errors: ' + (errs.length ? errs.join(' | ') : 'none'))
const pass =
  errs.length === 0 &&
  results.shotPanelVisible &&
  /\d/.test(results.fields.make || '') && /%/.test(results.fields.sim || '') &&
  results.fields.cut && results.fields.cut !== '--' &&
  results.ballsOnTable === 2 &&
  results.dragOntoTable
console.log(pass ? 'PASS' : 'FAIL')
process.exit(pass ? 0 : 1)
