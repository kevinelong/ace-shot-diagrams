// Batch scenario renderer: scenario state string -> standalone SVG (+ PNG preview).
//
// Usage:
//   node render-scenarios.js scenarios.json [--out diagrams] [--table-only] [--bg <color>] [--no-png]
//   node render-scenarios.js --state "v1|cue:25,25|1:75,25|p:cbr|b:1" --name straight-in [--out diagrams]
//
// scenarios.json: [{ "name": "straight-in", "state": "v1|cue:25,25|...", "tableOnly": true, "bg": "#ffffff" }, ...]
// Per-scenario fields override the global flags. State strings are the same
// format the app writes to the URL hash (see README "State Encoding").
//
// The renderer loads index.html#<state> headless, clicks the app's own
// "Export SVG" button, and captures the download — so output is identical
// to a manual export. --table-only crops the info panels off; --bg recolors
// the page background (e.g. white for print).

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---- CLI parsing ----
const args = process.argv.slice(2)
const flag = name => {
  const i = args.indexOf(name)
  return i >= 0
}
const opt = name => {
  const i = args.indexOf(name)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined
}

const outDir = resolve(opt('--out') ?? 'diagrams')
const globalTableOnly = flag('--table-only')
const globalTheme = opt('--theme')
const globalBg = opt('--bg')
const wantPng = !flag('--no-png')
const PNG_WIDTH = parseInt(opt('--png-width') ?? '1600', 10)

let scenarios
if (opt('--state')) {
  scenarios = [{ name: opt('--name') ?? 'scenario', state: opt('--state') }]
} else {
  const jsonPath = args.find(a => !a.startsWith('--') && a !== opt('--out') && a !== opt('--bg') && a !== opt('--png-width'))
  if (!jsonPath) {
    console.error('Usage: node render-scenarios.js <scenarios.json> [--out dir] [--table-only] [--bg color] [--no-png]')
    console.error('   or: node render-scenarios.js --state "<state>" --name <name>')
    process.exit(1)
  }
  scenarios = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'))
}

mkdirSync(outDir, { recursive: true })

// ---- SVG post-processing ----
// createExportSVG() appends the info panels after the <g id="balls"> group;
// the panel background is a deterministic <rect x="-6" y="60" ...>. Cutting
// there and re-closing the SVG yields a clean table-only diagram.
function cropToTable(svg) {
  const marker = svg.search(/<rect[^>]*x="-6"[^>]*y="60"/)
  if (marker >= 0) svg = svg.slice(0, marker) + '</svg>'
  svg = svg.replace('viewBox="-8 -8 116 88"', 'viewBox="-8 -8 116 66"')
  // background rect spans the old viewBox; shrink it to match
  svg = svg.replace(/(<rect x="-8" y="-8" width="116" height=")88(")/, '$174$2')
  // keep the exported aspect ratio consistent with the new viewBox
  svg = svg.replace(/(<svg[^>]*height=")607(")/, '$1455$2')
  return svg
}

function recolorBackground(svg, color) {
  return svg.replace(/(<rect x="-8" y="-8" width="116" height="\d+" fill=")#1a1a2e(")/, `$1${color}$2`)
}

// ---- print theme ----
// Brochure palette and dash patterns from the AceShot trifold
// (Dropbox INDESIGN_SETUP_GUIDE.txt), applied by element id so it
// survives any future color changes in the app's screen theme.
const PRINT_THEME = {
  'cue-ghost-line': { stroke: '#c09820', dash: '1.6,0.6,0.4,0.6' }, // aim line - gold dash-dot
  'actual-kick-path': { stroke: '#c09820', dash: '1.6,0.6,0.4,0.6' }, // kick aim - same as aim
  'target-line': { stroke: '#e84030', dash: '2,0.8' },              // pocket line - red dash
  'obj-ball-path': { stroke: '#e84030', dash: null },               // OB path - red solid
  'cue-ball-path': { stroke: '#2266bb', dash: null },               // CB path - blue solid
  'tangent-line': { stroke: '#339944', dash: '1,1' },               // tangent - green dash
  'follow-line': { stroke: '#2266bb', dash: '0.6,0.6' },            // follow - blue dots
  'draw-line': { stroke: '#dd6633', dash: '1.2,0.6,0.4,0.6' },      // draw - orange dash-dot
}

function restyleById(svg, id, stroke, dash) {
  return svg.replace(new RegExp(`<(line|path)([^>]*id="${id}"[^>]*?)\\s*/?>`), (m, tag, attrs) => {
    let a = attrs
      .replace(/\s+stroke="[^"]*"/, ` stroke="${stroke}"`)
      .replace(/\s+stroke-dasharray="[^"]*"/, '')
    if (dash) a += ` stroke-dasharray="${dash}"`
    return m.endsWith('/>') ? `<${tag}${a}/>` : `<${tag}${a}>`
  })
}

function applyPrintTheme(svg) {
  for (const [id, s] of Object.entries(PRINT_THEME)) {
    svg = restyleById(svg, id, s.stroke, s.dash)
  }
  return svg
}

// ---- main ----
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href

const browser = await chromium.launch()
const context = await browser.newContext({ acceptDownloads: true })
// suppress the first-run guided tour, whose overlay intercepts clicks
await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'))
const page = await context.newPage()
await page.setViewportSize({ width: 1400, height: 900 })

const results = []
for (const sc of scenarios) {
  const name = sc.name ?? `scenario-${results.length + 1}`
  const state = sc.state.startsWith('#') ? sc.state.slice(1) : sc.state
  const tableOnly = sc.tableOnly ?? globalTableOnly
  const theme = sc.theme ?? globalTheme
  // print theme defaults to a white page unless a bg is given explicitly
  const bg = sc.bg ?? globalBg ?? (theme === 'print' ? '#ffffff' : undefined)

  // ?empty=1 skips the auto-rack on init (index.html racks at +100ms otherwise,
  // burying the scenario balls); the r= cache-buster makes each goto a full
  // navigation — same-URL-different-hash would be a same-document jump and
  // the app would never re-read the state
  await page.goto(`${indexUrl}?empty=1&r=${results.length}#${state}`, { waitUntil: 'load' })
  await page.waitForSelector('#pool-table-svg')
  await page.waitForTimeout(1200) // let the solver and aid overlays settle

  // programmatic click: the button can be zero-size when its palette is
  // collapsed at headless viewport sizes, which defeats a real pointer click
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => document.getElementById('btnExportSVG').click()),
  ])
  const tmpPath = await download.path()
  let svg = readFileSync(tmpPath, 'utf-8')

  if (tableOnly) svg = cropToTable(svg)
  if (theme === 'print') svg = applyPrintTheme(svg)
  if (bg) svg = recolorBackground(svg, bg)

  const svgPath = join(outDir, `${name}.svg`)
  writeFileSync(svgPath, svg)

  let pngPath = null
  if (wantPng) {
    // rasterize the exact SVG we just wrote, at PNG_WIDTH px
    const rasterPage = await context.newPage()
    const sized = svg.replace(/<svg([^>]*?) width="\d+" height="\d+"/, '<svg$1')
    await rasterPage.setContent(
      `<body style="margin:0"><div id="d" style="width:${PNG_WIDTH}px">${sized}</div></body>`
    )
    const el = rasterPage.locator('#d > svg')
    pngPath = join(outDir, `${name}.png`)
    await el.screenshot({ path: pngPath })
    await rasterPage.close()
  }

  results.push({ name, svgPath, pngPath })
  console.log(`rendered ${name}  ->  ${svgPath}${pngPath ? ' + .png' : ''}`)
}

await browser.close()
console.log(`\n${results.length} scenario(s) rendered to ${outDir}`)
