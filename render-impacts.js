// Impact keyframe renderer: resolves a shot through the ace-physics Rust core
// (the app's solver picks the aim; the wasm runs the physics), then outputs
// the BEFORE position, each moment of impact (ball contacts, rail bounces,
// pockets), and the final REST position, as numbered PNG frames plus a
// slow-motion looping GIF. The browser is used only to render frames.
//
// Usage:
//   node render-impacts.js --state "v1|cue:30,15|1:65,32.5|p:cbr|b:1|m:9ball|f:5|e:0.0,0.0|s:auto" --name straight-in
//   node render-impacts.js scenarios.sample.json [--out impacts]
//
// Flags: --out <dir> (default impacts), --width <px> (GIF width, default 480),
//        --max-frames <n> (impact frames cap, default 8), --no-gif,
//        --engine js (fall back to the in-page JS sim instead of the wasm core)

import { chromium } from 'playwright-core'
import gifencPkg from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifencPkg
import pngjsPkg from 'pngjs'
const { PNG } = pngjsPkg
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'
import { simulate } from './ace-physics-node.js'

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
const wantTrails = !flag('--no-trails')
const engine = opt('--engine') ?? 'wasm'

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
  if (e.type === 'spin') return 'spin takes (draw/follow)'
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
  const PRIORITY = { break: 0, pocket: 1, 'ball-ball': 2, spin: 3, rail: 4 }
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
      stepEnd: c.lastStep,
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

// Per-ball path polylines from the event log: balls travel in straight
// lines between recorded events, so [initial, ...event snapshots, final]
// is each ball's exact trajectory.
function buildPaths(shot) {
  const paths = {}
  const add = (step, balls) => {
    for (const id in balls) {
      const b = balls[id]
      const arr = paths[id] ?? (paths[id] = [])
      const prev = arr[arr.length - 1]
      if (prev && Math.abs(prev.x - b.x) < 0.05 && Math.abs(prev.y - b.y) < 0.05) continue
      arr.push({ step, x: b.x, y: b.y })
    }
  }
  add(-1, shot.initial)
  for (const e of shot.events) add(e.step, e.balls)
  add(Number.MAX_SAFE_INTEGER, shot.final)
  return paths
}

function trailsUpTo(paths, stepEnd, poseBalls) {
  const trails = []
  for (const id in paths) {
    const pts = paths[id].filter(p => p.step <= stepEnd).map(p => ({ x: p.x, y: p.y }))
    // end the trail exactly at the ball's posed position for this frame
    const cur = poseBalls[id]
    if (cur && !cur.pocketed) {
      const last = pts[pts.length - 1]
      if (!last || Math.abs(last.x - cur.x) > 0.05 || Math.abs(last.y - cur.y) > 0.05) {
        pts.push({ x: cur.x, y: cur.y })
      }
    }
    if (pts.length < 2) continue
    const span = pts.reduce((s, p, i) => i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0, 0)
    if (span < 0.5) continue
    trails.push({ color: id === 'cue' ? '#f5f5f5' : '#ffd700', pts })
  }
  return trails
}

async function poseAndCaption(page, balls, caption, trails) {
  await page.evaluate(({ balls, caption, trails }) => {
    window.ACE_POSE(balls)
    const overlay = document.getElementById('connection-overlay')
    const NS = 'http://www.w3.org/2000/svg'

    let tg = document.getElementById('frame-trails')
    if (!tg) {
      tg = document.createElementNS(NS, 'g')
      tg.setAttribute('id', 'frame-trails')
      overlay.appendChild(tg)
    }
    while (tg.firstChild) tg.removeChild(tg.firstChild)
    for (const trail of trails) {
      const pl = document.createElementNS(NS, 'polyline')
      pl.setAttribute('points', trail.pts.map(p => `${p.x},${p.y}`).join(' '))
      pl.setAttribute('fill', 'none')
      pl.setAttribute('stroke', trail.color)
      pl.setAttribute('stroke-width', '0.35')
      pl.setAttribute('stroke-opacity', '0.55')
      pl.setAttribute('stroke-linejoin', 'round')
      pl.setAttribute('stroke-linecap', 'round')
      tg.appendChild(pl)
      // arrowhead on the final segment
      const n = trail.pts.length
      const a = trail.pts[n - 2], b = trail.pts[n - 1]
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      for (const off of [0.45, -0.45]) {
        const l = document.createElementNS(NS, 'line')
        l.setAttribute('x1', b.x); l.setAttribute('y1', b.y)
        l.setAttribute('x2', b.x - 1.3 * Math.cos(ang + off))
        l.setAttribute('y2', b.y - 1.3 * Math.sin(ang + off))
        l.setAttribute('stroke', trail.color)
        l.setAttribute('stroke-width', '0.35')
        l.setAttribute('stroke-opacity', '0.8')
        l.setAttribute('stroke-linecap', 'round')
        tg.appendChild(l)
      }
    }

    let t = document.getElementById('frame-caption')
    if (!t) {
      t = document.createElementNS(NS, 'text')
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
  }, { balls, caption, trails })
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu'] })
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

  let shot
  if (engine === 'js') {
    // legacy path: run the in-page JS sim and read its recorded events
    await page.evaluate(() => document.getElementById('btnShoot').click())
    await page.waitForFunction(() => window.ACE_SHOT && window.ACE_SHOT.done, null, { timeout: 20000 })
    shot = await page.evaluate(() => window.ACE_SHOT)
  } else {
    // wasm path: the app's solver picks the aim, the Rust core runs physics
    const plan = await page.evaluate(() => window.ACE_SHOT_PLAN())
    if (!plan) { console.log('  (no shot plan - cue/ghost not placed; skipping)'); continue }
    const result = simulate(plan.balls, plan.english)
    const initial = {}
    for (const id in plan.balls) {
      initial[id] = { x: Math.round(plan.balls[id].x * 100) / 100, y: Math.round(plan.balls[id].y * 100) / 100, pocketed: false }
    }
    // map continuous event times to the integer "step" the keyframe selector
    // and trail builder expect (physics ran at the same 60/sec native rate)
    const events = result.events.map(e => ({ ...e, step: Math.round(e.t * 60) }))
    shot = { initial, events, final: result.final }
  }
  console.log(`  ${shot.events.length} events (${engine})`)

  // hide UI chrome and aim overlays AFTER the shot so frames are clean
  await page.addStyleTag({ content: HIDE_UI_CSS })

  const keyframes = [
    { label: 'before', stepEnd: -1, balls: shot.initial },
    ...selectKeyframes(shot, MAX_IMPACT_FRAMES),
    { label: 'rest', stepEnd: Number.MAX_SAFE_INTEGER, balls: shot.final },
  ]
  const paths = buildPaths(shot)

  const smallFrames = []
  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i]
    const caption = `${i + 1}/${keyframes.length}  ${kf.label}`
    const trails = wantTrails && i > 0 ? trailsUpTo(paths, kf.stepEnd, kf.balls) : []
    await poseAndCaption(page, kf.balls, caption, trails)
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
