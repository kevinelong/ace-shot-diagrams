// Renders the ASCII and pro calendars to PNG using Playwright's bundled Chromium.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({ deviceScaleFactor: 2 });

// --- ASCII version: monospace terminal-style rendering ---
const ascii = readFileSync(join(here, 'july-2026-ascii.txt'), 'utf8')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const asciiHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #10141a; padding: 36px; }
  pre {
    margin: 0;
    font-family: "DejaVu Sans Mono", "Courier New", monospace;
    font-size: 14px;
    line-height: 1.28;
    color: #7ee88a;
    text-shadow: 0 0 6px rgba(126, 232, 138, .35);
    white-space: pre;
  }
</style></head><body><pre>${ascii}</pre></body></html>`;
await page.setViewportSize({ width: 950, height: 400 });
await page.setContent(asciiHtml);
await page.screenshot({ path: join(here, 'july-2026-ascii.png'), fullPage: true });
console.log('wrote july-2026-ascii.png');

// --- Pro version ---
await page.setViewportSize({ width: 1580, height: 400 });
await page.goto(pathToFileURL(join(here, 'july-2026-pro.html')).href);
await page.waitForTimeout(200);
await page.screenshot({ path: join(here, 'july-2026-pro.png'), fullPage: true });
console.log('wrote july-2026-pro.png');

await browser.close();
