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

const inputs = args.filter(a => a.endsWith('.svg'))
if (!inputs.length) { console.error('Usage: node svg-to-lineart.js <in1.svg> [in2.svg ...]'); process.exit(1) }

const browser = await chromium.launch()
const page = await browser.newPage()

for (const inPath of inputs) {
  const svgText = readFileSync(resolve(inPath), 'utf-8')
  const name = basename(inPath).replace(/\.svg$/, '')

  // Build the line-art SVG in a real DOM so we can walk the tree reliably
  const bwSvg = await page.evaluate((svgText) => {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const svg = doc.documentElement
    const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number)
    const vbW = vb[2] || 100, vbH = vb[3] || 100
    const ref = Math.max(vbW, vbH) * 0.002 // outline weight ~0.2% of the larger side
    const SHAPES = new Set(['rect', 'circle', 'ellipse', 'path', 'line', 'polyline', 'polygon'])

    // Text: legacy SVGs fake a label outline by stacking ~8 offset halo copies
    // behind one face copy. Deduplicate (same string at ~same position) to a
    // single black copy, so labels read crisp instead of smearing.
    const seen = new Set()
    svg.querySelectorAll('text').forEach(t => {
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
    return new XMLSerializer().serializeToString(svg)
  }, svgText)

  writeFileSync(join(outDir, `${name}_bw.svg`), bwSvg)

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
  const pngPath = join(outDir, `${name}_bw.png`)
  await el.screenshot({ path: pngPath, omitBackground: false })
  console.log(`lineart: ${pngPath}`)
}

await browser.close()
console.log('done')
