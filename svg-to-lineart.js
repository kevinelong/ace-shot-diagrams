// Convert SVGs to full-page black-and-white LINE DRAWINGS and rasterize them.
// Every filled shape becomes a black outline (fill:none, stroke:black), text
// stays solid black, dashes are preserved (aim/pocket lines), the background is
// dropped to white paper. Output: lineart/<name>_bw.png (+ _bw.svg).
//
// Usage: node svg-to-lineart.js <out-prefix> <in1.svg> [in2.svg ...]
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const outDir = join(__dirname, 'lineart')
mkdirSync(outDir, { recursive: true })
const RASTER_W = 1600 // px wide; printer scales to page
const ROTATE = args.includes('--rotate')   // 90deg so a wide table fills portrait paper
const hi = args.indexOf('--hide')
const HIDE_IDS = hi >= 0 && hi + 1 < args.length ? args[hi + 1].split(',').map(s => s.trim()).filter(Boolean) : []
const SUFFIX = ROTATE ? '_bw_rot' : '_bw'

const inputs = args.filter(a => a.endsWith('.svg'))
if (!inputs.length) { console.error('Usage: node svg-to-lineart.js <in1.svg> [in2.svg ...]'); process.exit(1) }

const browser = await chromium.launch()
const page = await browser.newPage()

for (const inPath of inputs) {
  const svgText = readFileSync(resolve(inPath), 'utf-8')
  const name = basename(inPath).replace(/\.svg$/, '')

  // Build the line-art SVG in a real DOM so we can walk the tree reliably
  const bwSvg = await page.evaluate(({ svgText, rotate, hideIds }) => {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const svg = doc.documentElement
    const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number)
    const vbW = vb[2] || 100, vbH = vb[3] || 100

    // drop requested layers (grid, cue stick, etc.) for a clean isolated diagram
    for (const id of hideIds) svg.querySelectorAll('[id="' + id + '"]').forEach(e => e.remove())

    // drop the ghost-ball glow ring (outer halo circle, r > ball radius) so the
    // ghost reads as a single ball-size circle instead of a heavy double ring
    svg.querySelectorAll('#ghost-ball-indicator circle').forEach(c => {
      if (parseFloat(c.getAttribute('r') || '0') > 1.2) c.remove()
    })

    // rail-frame is one path = outer rounded border + an inner rectangle whose
    // sharp corners land on the corner-pocket centers (they poke into the pocket
    // circles). Keep only the outer border; slate-surface already draws the
    // playing-area boundary with rounded pocket cutouts.
    const railFrame = svg.querySelector('#rail-frame')
    if (railFrame) {
      const d = railFrame.getAttribute('d') || ''
      const subs = d.split(/(?=M)/).filter(s => s.trim())
      if (subs.length > 1) railFrame.setAttribute('d', subs[0].trim())
    }
    const ref = Math.max(vbW, vbH) * 0.002 // outline weight ~0.2% of the larger side
    const SHAPES = new Set(['rect', 'circle', 'ellipse', 'path', 'line', 'polyline', 'polygon'])

    // Text: legacy SVGs fake a label outline by stacking ~8 offset halo copies
    // behind one face copy. Deduplicate (same string at ~same position) to a
    // single black copy, so labels read crisp instead of smearing.
    const seen = new Set()
    svg.querySelectorAll('text').forEach(t => {
      // drop glow/halo copies (white or translucent-white fill) so they don't
      // blacken into a drop-shadow behind the real label
      const tf = (t.getAttribute('fill') || (t.style && t.style.fill) || '').replace(/\s/g, '').toLowerCase()
      if (tf === '#fff' || tf === '#ffffff' || tf === 'white' || /rgba?\(255,255,255/.test(tf)) { t.remove(); return }
      const str = (t.textContent || '').trim()
      const tsp = t.querySelector('tspan')
      const x = tsp ? parseFloat((tsp.getAttribute('x') || '0').split(/[\s,]+/)[0]) : 0
      const y = tsp ? parseFloat((tsp.getAttribute('y') || '0').split(/[\s,]+/)[0]) : 0
      const key = str + '@' + (t.getAttribute('transform') || '') + '@' + Math.round(x / 9) + ',' + Math.round(y / 9)
      if (seen.has(key)) { t.remove(); return }
      seen.add(key)
      t.setAttribute('fill', '#000'); t.setAttribute('stroke', 'none')
      t.removeAttribute('opacity'); t.removeAttribute('fill-opacity')
      if (t.style) { t.style.fill = '#000'; t.style.stroke = 'none' }
      t.querySelectorAll('tspan').forEach(s => {
        s.setAttribute('fill', '#000'); s.setAttribute('stroke', 'none')
        if (s.style) { s.style.fill = '#000'; s.style.stroke = 'none' }
      })
    })

    const all = svg.querySelectorAll('*')
    all.forEach(el => {
      const tag = el.tagName.toLowerCase()
      if (tag === 'text' || tag === 'tspan') return  // handled above
      if (!SHAPES.has(tag)) return

      // drop full-viewBox background rects to white paper
      if (tag === 'rect') {
        const w = parseFloat(el.getAttribute('width') || '0')
        const h = parseFloat(el.getAttribute('height') || '0')
        if (w >= vbW * 0.97 && h >= vbH * 0.97) {
          el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'none')
          if (el.style) { el.style.fill = 'none'; el.style.stroke = 'none' }
          return
        }
      }

      el.setAttribute('fill', 'none')
      el.setAttribute('stroke', '#000')
      el.removeAttribute('opacity'); el.removeAttribute('fill-opacity'); el.removeAttribute('stroke-opacity')
      if (el.style) { el.style.fill = 'none'; el.style.stroke = '#000'; el.style.opacity = ''; el.style.fillOpacity = ''; el.style.strokeOpacity = '' }
      const sw = parseFloat(el.getAttribute('stroke-width') || '0')
      if (!sw || sw < ref) el.setAttribute('stroke-width', ref.toFixed(3))
    })

    // annotation leaders/arc/dots: light gray + half the weight of other lines,
    // so the pointers read as secondary to the shot lines
    const refHalf = (ref * 0.5).toFixed(3)
    svg.querySelectorAll('#layer-annotations *').forEach(el => {
      const tag = el.tagName.toLowerCase()
      if (tag === 'text' || tag === 'tspan' || !SHAPES.has(tag)) return
      if (tag === 'circle') { el.setAttribute('fill', '#999'); el.setAttribute('stroke', 'none') }
      else { el.setAttribute('fill', 'none'); el.setAttribute('stroke', '#999'); el.setAttribute('stroke-width', refHalf) }
    })

    // rotate 90deg so a wide (2:1) table becomes tall and fills portrait paper
    if (rotate) {
      const cx = vb[0] + vbW / 2, cy = vb[1] + vbH / 2
      const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.setAttribute('transform', `rotate(90 ${cx} ${cy})`)
      while (svg.firstChild) g.appendChild(svg.firstChild)
      svg.appendChild(g)
      svg.setAttribute('viewBox', `${cx - vbH / 2} ${cy - vbW / 2} ${vbH} ${vbW}`)
    }
    return new XMLSerializer().serializeToString(svg)
  }, { svgText, rotate: ROTATE, hideIds: HIDE_IDS })

  writeFileSync(join(outDir, `${name}${SUFFIX}.svg`), bwSvg)

  // Rasterize on white at full width
  await page.setContent(
    `<!doctype html><body style="margin:0;background:#fff">
       <div id="d" style="width:${RASTER_W}px;background:#fff">${bwSvg}</div></body>`)
  await page.evaluate(() => {
    const s = document.querySelector('#d > svg')
    s.removeAttribute('width'); s.removeAttribute('height')
    s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'
  })
  const el = page.locator('#d > svg')
  const pngPath = join(outDir, `${name}${SUFFIX}.png`)
  await el.screenshot({ path: pngPath, omitBackground: false })
  console.log(`lineart: ${pngPath}`)
}

await browser.close()
console.log('done')
