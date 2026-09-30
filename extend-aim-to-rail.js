// Post-process a rendered scenario SVG: extend the cue->ghost aim line forward
// past the ghost ball to the cushion, so the cut angle (e.g. 30deg vs the pocket
// line) is illustrated all the way to the rail.
//
// Usage: node extend-aim-to-rail.js <path-to.svg>
// Idempotent: removes any prior appended extension before adding a fresh one.
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const inPath = process.argv[2]
if (!inPath) { console.error('Usage: node extend-aim-to-rail.js <file.svg>'); process.exit(1) }
const file = resolve(inPath)
let svg = readFileSync(file, 'utf-8')

// strip a previously appended extension (marked) so re-runs don't stack lines
svg = svg.replace(/\s*<line[^>]*data-aim-ext="1"[^>]*\/>/g, '')

const m = svg.match(/id="cue-ghost-line"[^>]*\bd="M\s*([\d.eE+-]+)\s+([\d.eE+-]+)\s+L\s*([\d.eE+-]+)\s+([\d.eE+-]+)"/)
if (!m) { console.error('cue-ghost-line not found'); process.exit(1) }
const [cx, cy, gx, gy] = m.slice(1).map(Number)
const dx = gx - cx, dy = gy - cy

// forward intersection with the playing-surface bounds (inset slightly to the rail)
const X0 = 2, X1 = 98, Y0 = 2, Y1 = 48
let t = Infinity
for (const [d, p, lo, hi] of [[dx, gx, X0, X1], [dy, gy, Y0, Y1]]) {
  if (d > 0) t = Math.min(t, (hi - p) / d)
  else if (d < 0) t = Math.min(t, (lo - p) / d)
}
const rx = +(gx + dx * t).toFixed(2), ry = +(gy + dy * t).toFixed(2)

const ext = `<line data-aim-ext="1" x1="${gx}" y1="${gy}" x2="${rx}" y2="${ry}" stroke="#c09820" stroke-width="0.3" stroke-dasharray="1.6,0.6,0.4,0.6" fill="none"/>`
svg = svg.replace('</svg>', ext + '</svg>')
writeFileSync(file, svg)
console.log(`aim extended from ghost(${gx},${gy}) to rail(${rx},${ry})`)
