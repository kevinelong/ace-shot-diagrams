// Measure rendered width (user units) of annotation labels so they can be
// packed into left/right aligned columns despite the middle text-anchor.
import { chromium } from '@playwright/test'

const LABELS = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(`<!doctype html><svg id="s" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"></svg>`)
const widths = await page.evaluate((labels) => {
  const NS = 'http://www.w3.org/2000/svg'
  const s = document.getElementById('s')
  const out = {}
  for (const txt of labels) {
    const t = document.createElementNS(NS, 'text')
    t.setAttribute('font-family', 'Arial, sans-serif')
    t.setAttribute('font-size', '2.4')
    t.setAttribute('font-weight', 'bold')
    t.textContent = txt
    s.appendChild(t)
    out[txt] = t.getComputedTextLength()
    s.removeChild(t)
  }
  return out
}, LABELS)
console.log(JSON.stringify(widths, null, 2))
await browser.close()
