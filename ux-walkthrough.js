// Drives the app with real mouse actions and captures each stage for UX review.
import { chromium } from '@playwright/test'
import { join, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href
const out = join(__dirname, 'ux-shots')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext()
await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'))
const page = await context.newPage()
const log = []
page.on('pageerror', e => log.push('PAGEERROR ' + e))

const shot = (name) => page.screenshot({ path: join(out, name) })
const killTour = () => page.evaluate(() => {
  for (const id of ['tourTooltip', 'tourOverlay', 'tourSpotlight']) {
    const el = document.getElementById(id)
    if (el) { el.style.display = 'none'; el.style.pointerEvents = 'none' }
  }
})
const centerOf = async (sel) => {
  const b = await page.locator(sel).first().boundingBox()
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b } : null
}

await page.setViewportSize({ width: 1440, height: 900 })

// 1. default load (auto-racked 8-ball)
await page.goto(indexUrl, { waitUntil: 'load' })
await page.waitForTimeout(1600); await killTour()
await shot('ux-01-default-rack.png')

// PROBE: can a ball be dragged out of the rack palette? (expected: no)
await page.goto(`${indexUrl}?empty=1&r=probe`, { waitUntil: 'load' })
await page.waitForSelector('#pool-table-svg'); await page.waitForTimeout(700); await killTour()
const table = await page.locator('#pool-table-svg').boundingBox()
const tp = (fx, fy) => ({ x: table.x + table.width * fx, y: table.y + table.height * fy })
const src = await centerOf('#palette-balls #ball-1')
if (src) {
  const d = tp(0.5, 0.5)
  await page.mouse.move(src.x, src.y); await page.mouse.down()
  await page.mouse.move(d.x, d.y, { steps: 12 }); await page.mouse.up()
  await page.waitForTimeout(300)
}
const draggedOut = await page.evaluate(() =>
  !!document.getElementById('ball-1')?.classList.contains('on-table'))
log.push('drag-from-palette places ball on table: ' + draggedOut)

// 2. configured shot via shared state (the reliable placement path)
await page.goto(`${indexUrl}#v1|cue:35,32|1:66,30|p:cbr|b:1|m:9ball|f:6|e:0.0,0.0|s:auto`, { waitUntil: 'load' })
await page.waitForTimeout(1500); await killTour()
await shot('ux-02-configured-shot.png')
log.push('configured: ' + JSON.stringify(await page.evaluate(() => ({
  sim: [...document.querySelectorAll('#simMakeDisplay')].map(e => e.textContent),
  make: [...document.querySelectorAll('#makeProbabilityDisplay')].map(e => e.textContent),
  cut: document.getElementById('cutAngleDisplay-palette')?.textContent,
}))))

// 3. real-mouse drag of the on-table cue ball to reposition (aim updates live)
const t2 = await page.locator('#pool-table-svg').boundingBox()
const cueBox = await page.locator('#ball-cue').boundingBox()
if (cueBox) {
  const cx = cueBox.x + cueBox.width / 2, cy = cueBox.y + cueBox.height / 2
  const dest = { x: t2.x + t2.width * 0.32, y: t2.y + t2.height * 0.68 }
  await page.mouse.move(cx, cy); await page.mouse.down()
  await page.mouse.move((cx + dest.x) / 2, (cy + dest.y) / 2, { steps: 10 })
  await page.mouse.move(dest.x, dest.y, { steps: 10 }); await page.mouse.up()
  await page.waitForTimeout(900)
}
await shot('ux-03-drag-reposition.png')

// 4. retarget to a different pocket (real click on the SVG pocket)
await page.locator('.pocket-target[data-pocket="corner-tr"]').click({ force: true })
await page.waitForTimeout(900)
await shot('ux-04-retarget-pocket.png')

// 5. apply draw (bottom english): click the lower area of the cue contact diagram
const cd = await page.locator('#contact-diagram').boundingBox()
if (cd) {
  await page.mouse.click(cd.x + cd.width / 2, cd.y + cd.height * 0.80)
  await page.waitForTimeout(700)
}
await shot('ux-05-draw-english.png')
log.push('english after click: ' + JSON.stringify(await page.evaluate(() =>
  typeof contactOffset !== 'undefined' ? contactOffset : null).catch(() => null)))

// 6. shoot: mid-flight and final
await page.locator('#btnShoot').click()
await page.waitForTimeout(260)
await shot('ux-06-shot-mid.png')
await page.waitForFunction(() => window.ACE_SHOT && window.ACE_SHOT.done, null, { timeout: 8000 }).catch(() => {})
await page.waitForTimeout(300)
await shot('ux-07-shot-final.png')

// 7. shot-info palette close-up
const sp = await page.locator('#palette-shot').boundingBox()
if (sp && sp.width > 0) await page.screenshot({ path: join(out, 'ux-08-shotinfo-closeup.png'), clip: sp })

// 8. mobile portrait
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(indexUrl, { waitUntil: 'load' })
await page.waitForTimeout(1600); await killTour()
await shot('ux-09-mobile-portrait.png')

await browser.close()
console.log(log.join('\n') || 'no log')
console.log('done')
