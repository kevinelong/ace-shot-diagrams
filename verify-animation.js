// One-off verification for the fixed-timestep animation refactor.
import { chromium } from '@playwright/test'
import { join, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href

const browser = await chromium.launch()
const context = await browser.newContext()
await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'))
const page = await context.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.setViewportSize({ width: 1400, height: 900 })

const ballPos = id => page.evaluate(id => {
  const el = document.getElementById(`ball-${id}`)
  if (!el || el.style.display === 'none') return null
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}, id)

const toastText = () => page.evaluate(() => document.getElementById('toastNotification')?.textContent ?? '')

async function runShot(label) {
  const before1 = await ballPos('1')
  await page.evaluate(() => document.getElementById('btnShoot').click())

  // sample cue position during the animation to prove gradual motion
  const samples = []
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(100)
    samples.push(await ballPos('cue'))
    const t = await toastText()
    if (/Pocketed|pocketed|Scratch/.test(t)) break
  }
  const t = await toastText()
  const after1 = await ballPos('1')
  const moved1 = !before1 || !after1 ||
    Math.hypot(after1.x - before1.x, after1.y - before1.y) > 2
  const distinctCuePositions = new Set(samples.filter(Boolean).map(p => `${p.x.toFixed(0)},${p.y.toFixed(0)}`)).size
  console.log(`[${label}] result toast: "${t.trim()}"`)
  console.log(`[${label}] object ball moved/pocketed: ${moved1}; distinct cue positions sampled during animation: ${distinctCuePositions}`)
  return { finished: /Pocketed|pocketed|Scratch/.test(t), moved1, distinctCuePositions }
}

// --- Test 1: regular shot, near-straight to corner ---
await page.goto(`${indexUrl}?empty=1&r=t1#v1|cue:30,15|1:65,32.5|p:cbr|b:1|m:9ball|f:5|e:0.0,0.0|s:auto`, { waitUntil: 'load' })
await page.waitForTimeout(1500)
const shot = await runShot('shot')

// --- Test 2: full-power break (frozen rack path) ---
await page.goto(`${indexUrl}?r=t2`, { waitUntil: 'load' })
await page.waitForTimeout(1500) // auto-rack fires at +100ms, toast 'Rack set'
const rackToast = await toastText()
console.log(`[break] pre-shot toast: "${rackToast.trim()}"`)
const breakRun = await runShot('break')

await page.screenshot({ path: 'verify-after-break.png' })
await browser.close()

console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`)
const pass = errors.length === 0 && shot.finished && shot.moved1 && shot.distinctCuePositions >= 2 && breakRun.finished
console.log(pass ? 'PASS' : 'FAIL')
process.exit(pass ? 0 : 1)
