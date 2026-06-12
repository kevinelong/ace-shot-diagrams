// Impact keyframe renderer: runs a shot through the app's physics, then
// outputs the BEFORE position, each moment of impact (ball contacts, rail
// bounces, pockets - recorded by window.ACE_SHOT in index.html), and the
// final REST position, as numbered PNG frames plus a slow-motion looping
// GIF assembled from them.
//
// Usage:
//   node render-impacts.js --state "v1|cue:30,15|1:65,32.5|p:cbr|b:1|m:9ball|f:5|e:0.0,0.0|s:auto" --name straight-in
//   node render-impacts.js scenarios.sample.json [--out impacts]
//
// Flags: --out <dir> (default impacts), --width <px> (GIF width, default 480),
//        --max-frames <n> (impact frames cap, default 8), --no-gif

import { chromium } from '@playwright/test'
import gifencPkg from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifencPkg
import pngjsPkg from 'pngjs'
const { PNG } = pngjsPkg
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const opt = name => {
  const i = args.indexOf(name)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined
}
const flag = name => args.includes(name)

const outDir = resolve(opt('--out') ?? 'impacts')
const GIF_WIDTH = parseInt(opt('--width') ?? '480', 10)
const MAX_IMPACT_FRAMES = parseInt(opt('--max-frames') ?? '8', 10)
const wantGif = !flag('--no-gif')

let scenarios
if (opt('--state')) {
  scenarios = [{ name: opt('--name') ?? 'shot', state: opt('--state') }]
} else {
  const jsonPath = args.find(a => !a.startsWith('--') && a !== opt('--out') && a !== opt('--width') && a !== opt('--max-frames'))
  if (!jsonPath) {
    console.error('Usage: node render-impacts.js --state "<state>" --name <name> | <scenarios.json>')
    process.exit(1)
  }
  scenarios = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'))
}

mkdirSync(outDir, { recursive: true })

// ---- keyframe selection ----
// Cluster events within a few physics steps (one perceptual "moment"), label
// each cluster by its most significant member, cap rail-only noise.
function describe(e) {
  if (e.type === 'break') return 'break!'
  if (e.type === 'ball-ball') {
    // the cue (or lower-numbered ball) reads as the actor
    const [a, b] = e.ids.includes('cue') ? ['cue', e.ids.find(i => i !== 'cue')] : e.ids
    return `${a} hits ${b}`
  }
  if (e.type === 'pocket') return `${e.id} pocketed`
  if (e.type === 'rail') return `${e.id} off ${e.rail} rail`
  return e.type
}

function selectKeyframes(shot, maxFrames) {
  const PRIORITY = { break: 0, pocket: 1, 'ball-ball': 2, rail: 3 }
  const clusters = []
  for (const e of shot.events) {
    const c = clusters[clusters.length - 1]
    if (c && e.step - c.lastStep <= 3) {
      c.members.push(e)
      c.lastStep = e.step
    } else {
      clusters.push({ step: e.step, lastStep: e.step, members: [e] })
    }
  }

  let frames = clusters.map(c => {
    const best = [...c.members].sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type])[0]
    return {
      step: c.step,
      label: describe(best),
      isRailOnly: c.members.every(m => m.type === 'rail'),
      balls: c.members[c.members.length - 1].balls,
    }
  })

  if (frames.length > maxFrames) {
    const important = frames.filter(f => !f.isRailOnly)
    const rails = frames.filter(f => f.isRailOnly)
    frames = [...important, ...rails.slice(0, Math.max(0, maxFrames - important.length))]
      .sort((a, b) => a.step - b.step)
      .slice(0, maxFrames)
    console.log(`  (capped to ${frames.length} impact frames; dropped ${clusters.length - frames.length} rail-only moments)`)
  }
  return frames
}

// ---- page helpers ----
const HIDE_UI_CSS = `
  [id^="palette-"], [id^="restore-"], #toastNotification, .ball-rack,
  .instructions, .shot-info, .cue-controls-panel,
  #cue-ghost-line, #target-line, #obj-ball-path, #cue-ball-path,
  #actual-kick-path, #tangent-line, #follow-line, #draw-line,
  #ghost-ball-indicator, #kick-aim-indicator, #ball-ghost, #cue-stick
  { display: none !important; visibility: hidden !important; }
`

async function poseAndCaption(page, balls, caption) {
  await page.evaluate(({ balls, caption }) => {
    window.ACE_POSE(balls)
    const overlay = document.getElementById('connection-overlay')
    let t = document.getElementById('frame-caption')
    if (!t) {
      t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      t.setAttribute('id', 'frame-caption')
      t.setAttribute('x', '50')
      t.setAttribute('y', '-3.5')
      t.setAttribute('text-anchor', 'middle')
      t.setAttribute('font-family', 'Arial, sans-serif')
      t.setAttribute('font-size', '3')
      t.setAttribute('font-weight', 'bold')
      t.setAttribute('fill', '#ffffff')
      overlay.appendChild(t)
    }
    t.textContent = caption
  }, { balls, caption })
}

async function captureFrame(page, scalePage) {
  const box = await page.locator('#connection-overlay').boundingBox()
  const buf = await page.screenshot({ clip: box })
  // downscale to GIF width via an <img> in a scratch page
  await scalePage.setContent(
    `<body style="margin:0;background:#1a1a2e"><img id="f" style="display:block;width:${GIF_WIDTH}px" src="data:image/png;base64,${buf.toString('base64')}"></body>`
  )
  return { full: buf, small: await scalePage.locator('#f').screenshot() }
}

// ---- main ----
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href
const browser = await chromium.launch()
const context = await browser.newContext()
await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'))
const page = await context.newPage()
const scalePage = await context.newPage()
await page.setViewportSize({ width: 1400, height: 900 })

for (const sc of scenarios) {
  const name = sc.name ?? 'shot'
  const state = sc.state.startsWith('#') ? sc.state.slice(1) : sc.state

  console.log(`${name}:`)
  await page.goto(`${indexUrl}?empty=1&r=${name}#${state}`, { waitUntil: 'load' })
  await page.waitForSelector('#pool-table-svg')
  await page.waitForTimeout(1200)

  // run the shot and wait for the physics to finish
  await page.evaluate(() => document.getElementById('btnShoot').click())
  await page.waitForFunction(() => window.ACE_SHOT && window.ACE_SHOT.done, null, { timeout: 20000 })
  const shot = await page.evaluate(() => window.ACE_SHOT)
  console.log(`  ${shot.events.length} raw events recorded`)

  // hide UI chrome and aim overlays AFTER the shot so frames are clean
  await page.addStyleTag({ content: HIDE_UI_CSS })

  const keyframes = [
    { label: 'before', balls: shot.initial },
    ...selectKeyframes(shot, MAX_IMPACT_FRAMES),
    { label: 'rest', balls: shot.final },
  ]

  const smallFrames = []
  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i]
    const caption = `${i + 1}/${keyframes.length}  ${kf.label}`
    await poseAndCaption(page, kf.balls, caption)
    const { full, small } = await captureFrame(page, scalePage)
    const framePath = join(outDir, `${name}-${String(i + 1).padStart(2, '0')}-${kf.label.replace(/[^a-z0-9]+/gi, '_')}.png`)
    writeFileSync(framePath, full)
    smallFrames.push(small)
    console.log(`  frame ${i + 1}: ${kf.label}`)
  }

  if (wantGif) {
    const gif = GIFEncoder()
    for (let i = 0; i < smallFrames.length; i++) {
      const png = PNG.sync.read(smallFrames[i])
      const palette = quantize(png.data, 256)
      const index = applyPalette(png.data, palette)
      // hold the before-picture and the final rest position longer
      const delay = i === 0 ? 1500 : i === smallFrames.length - 1 ? 2200 : 1000
      gif.writeFrame(index, png.width, png.height, { palette, delay, repeat: 0 })
    }
    gif.finish()
    const gifPath = join(outDir, `${name}.gif`)
    writeFileSync(gifPath, gif.bytes())
    console.log(`  gif: ${gifPath} (${keyframes.length} frames)`)
  }
}

await browser.close()
console.log('done')
