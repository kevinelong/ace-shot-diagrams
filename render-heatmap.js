// Make-% heatmap: for a fixed object ball + pocket (+ optional blockers),
// sweep the CUE ball across the table and, at each spot, run a Monte Carlo
// make-% through the ace-physics core. Paints a green->red heatmap of "from
// where is this shot makeable" — the position-play picture the fast core
// enables. Output: heatmaps/<name>.svg + .png.
//
// Usage:
//   node render-heatmap.js --ob 70,30 --pocket corner-br [--name shot]
//        [--force 6] [--sigma 1.5] [--n 40] [--step 2.5]
//        [--others "9:60,22;3:40,18"] [--no-png]
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { simulate } from './ace-physics-node.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d }
const flag = n => args.includes(n)

const BALL_D = 2.25
const POCKETS = {
  'corner-tl': { x: 1.5, y: 1.5 }, 'corner-tr': { x: 98.5, y: 1.5 },
  'corner-bl': { x: 1.5, y: 48.5 }, 'corner-br': { x: 98.5, y: 48.5 },
  'side-top': { x: 50, y: 0 }, 'side-bottom': { x: 50, y: 50 },
}
const THROW_MU = 0.06

const ob = (opt('--ob', '70,30')).split(',').map(Number)
const OB = { x: ob[0], y: ob[1] }
const pocketName = opt('--pocket', 'corner-br')
const PK = POCKETS[pocketName]
const name = opt('--name', `heatmap-${pocketName}`)
const force = parseFloat(opt('--force', '6'))
const sigmaDeg = parseFloat(opt('--sigma', '1.5'))
const N = parseInt(opt('--n', '40'), 10)
const step = parseFloat(opt('--step', '2.5'))
const wantPng = !flag('--no-png')
const others = {}
for (const tok of (opt('--others', '') || '').split(';').filter(Boolean)) {
  const [id, xy] = tok.split(':'); const [x, y] = xy.split(',').map(Number); others[id] = { x, y }
}
if (!PK) { console.error('unknown pocket: ' + pocketName); process.exit(1) }

// throw-compensated aim (mirrors index.html / verify-rust-parity)
function aimDir(cue) {
  const pd = Math.hypot(PK.x - OB.x, PK.y - OB.y) || 1
  const d = { x: (PK.x - OB.x) / pd, y: (PK.y - OB.y) / pd }
  const contact = { x: OB.x - d.x * BALL_D, y: OB.y - d.y * BALL_D }
  const al = Math.hypot(contact.x - cue.x, contact.y - cue.y) || 1
  const ap = { x: (contact.x - cue.x) / al, y: (contact.y - cue.y) / al }
  const cosT = Math.max(ap.x * d.x + ap.y * d.y, 1e-6)
  const sinT = ap.x * d.y - ap.y * d.x
  const phi = Math.atan(Math.min(THROW_MU, 0.5 * Math.abs(sinT) / cosT)) * Math.sign(sinT)
  const ca = Math.cos(phi), sa = Math.sin(phi)
  return { x: d.x * ca - d.y * sa, y: d.x * sa + d.y * ca }
}

// seeded RNG so the map is reproducible
let seed = 99991
function rng() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
function gauss() { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

function makePctAt(cue) {
  const aim = aimDir(cue)
  const ghost = { x: OB.x - aim.x * BALL_D, y: OB.y - aim.y * BALL_D }
  const ad = Math.hypot(ghost.x - cue.x, ghost.y - cue.y) || 1
  const base = Math.atan2(ghost.y - cue.y, ghost.x - cue.x)
  const speed = force * 0.75 * 60
  const sigma = sigmaDeg * Math.PI / 180
  let make = 0
  for (let i = 0; i < N; i++) {
    const ang = base + gauss() * sigma
    const balls = { cue: { x: cue.x, y: cue.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed }, '1': { x: OB.x, y: OB.y } }
    for (const id in others) balls[id] = { x: others[id].x, y: others[id].y }
    const r = simulate(balls, { x: 0, y: 0 })
    if (r.error) continue
    const pk = r.events.filter(e => e.type === 'pocket')
    if (pk.some(e => e.id === 'cue')) continue
    if (pk.some(e => e.id === '1' && e.pocket === pocketName)) make++
  }
  return make / N
}

// green (high) -> yellow -> red (low)
function color(p) {
  const hue = 120 * p // 0=red,120=green
  return `hsl(${hue.toFixed(0)},85%,50%)`
}

// ---- sweep ----
const X0 = 4, X1 = 96, Y0 = 4, Y1 = 46
let best = { p: -1 }
const cells = []
for (let cy = Y0; cy <= Y1; cy += step) {
  for (let cx = X0; cx <= X1; cx += step) {
    const cue = { x: cx, y: cy }
    // skip spots overlapping the OB / blockers
    if (Math.hypot(cx - OB.x, cy - OB.y) < BALL_D * 1.4) continue
    let blocked = false
    for (const id in others) if (Math.hypot(cx - others[id].x, cy - others[id].y) < BALL_D * 1.4) blocked = true
    if (blocked) continue
    const p = makePctAt(cue)
    cells.push({ cx, cy, p })
    if (p > best.p) best = { p, cx, cy }
  }
}
console.log(`${name}: ${cells.length} cue positions, best ${(best.p * 100).toFixed(0)}% at (${best.cx},${best.cy})`)

// ---- render SVG (viewBox matches the table coords) ----
const cellsSvg = cells.map(c =>
  `<rect x="${(c.cx - step / 2).toFixed(2)}" y="${(c.cy - step / 2).toFixed(2)}" width="${step}" height="${step}" fill="${color(c.p)}" fill-opacity="0.85"/>`
).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 62" font-family="Arial">
  <rect x="-6" y="-6" width="112" height="62" fill="#11161d"/>
  <rect x="0" y="0" width="100" height="50" fill="#0d1520" stroke="#888" stroke-width="0.4"/>
  ${cellsSvg}
  ${Object.values(POCKETS).map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.2" fill="#000" stroke="#444" stroke-width="0.3"/>`).join('')}
  <circle cx="${PK.x}" cy="${PK.y}" r="3" fill="none" stroke="#0ff" stroke-width="0.6"/>
  <circle cx="${OB.x}" cy="${OB.y}" r="${BALL_D / 2}" fill="#ffd700" stroke="#000" stroke-width="0.3"/>
  <text x="${OB.x}" y="${OB.y + 0.9}" text-anchor="middle" font-size="2.2" font-weight="bold">OB</text>
  ${Object.entries(others).map(([id, p]) => `<circle cx="${p.x}" cy="${p.y}" r="${BALL_D / 2}" fill="#333" stroke="#000" stroke-width="0.3"/><text x="${p.x}" y="${p.y + 0.9}" text-anchor="middle" font-size="2" fill="#fff">${id}</text>`).join('')}
  <text x="0" y="-1.5" font-size="3" fill="#fff" font-weight="bold">Make % heatmap by cue position  -  OB(${OB.x},${OB.y}) -> ${pocketName}, power ${force}</text>
</svg>`

const out = join(__dirname, 'heatmaps')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, `${name}.svg`), svg)

if (wantPng) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu'] })
  const page = await browser.newPage()
  await page.setContent(`<body style="margin:0">${svg}</body>`)
  await page.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); s.style.width = '1600px'; s.style.height = 'auto'; s.style.display = 'block' })
  await page.locator('svg').screenshot({ path: join(out, `${name}.png`) })
  await browser.close()
  console.log(`heatmap: ${join(out, name + '.png')}`)
}
