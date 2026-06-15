// Parametrized shot recorder (cousin of record-break.cjs) — records an
// arbitrary set-up shot via the URL hash scheme so we can capture the SAME cut
// shot under different physics builds for a before/after comparison.
//   SHOT=<hash-suffix> OUTDIR=<name> node record-shot.cjs
// Same virtualized-rAF clock trick: one virtual frame per screenshot, so the
// playback is smooth and deterministic regardless of screenshot wall-time.
const { chromium } = require('playwright-core');
const { join } = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

// default: a slow thin cut to the bottom-right corner; the app auto-solves the
// (throw-naive) aim, so collision throw decides make vs miss.
const SHOT = process.env.SHOT || '?empty=1&r=cut#v1|cue:25,25|1:50,29|p:cbr|b:1|m:9ball|f:2|e:0.0,0.0|s:auto';
const OUTDIR = process.env.OUTDIR || 'cut';
const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href + SHOT;
const FRAMES = join(__dirname, 'out', OUTDIR);
fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });

const FPS = 30, DT = 1000 / FPS, MAX_FRAMES = 300, PRE = 12, POST = 30;

function installVClock() {
  let vnow = 0, nextId = 1; const cbs = new Map();
  window.requestAnimationFrame = (cb) => { const id = nextId++; cbs.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { cbs.delete(id); };
  window.__pump = (dt) => { vnow += dt; const due = [...cbs]; cbs.clear(); for (const [, cb] of due) { try { cb(vnow); } catch (e) {} } return cbs.size; };
}

(async () => {
  const s = { frames: 0, done: false };
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'] });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 640 } });
  await ctx.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'));
  await ctx.addInitScript(installVClock);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(indexUrl, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '.tool-palette,#shotInfo,.cue-controls-panel,.toast-notification{display:none !important;}' });
  const clip = await page.evaluate(() => {
    const el = document.querySelector('#poolTable, #tableSvg, svg'); if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y));
    const w = Math.min(Math.ceil(r.width), 1100 - x), h = Math.min(Math.ceil(r.height), 640 - y);
    return (w > 200 && h > 100) ? { x, y, width: w, height: h } : null;
  });
  const shoot = async () => page.screenshot({ path: join(FRAMES, `f${String(s.frames++).padStart(4, '0')}.png`), clip: clip || undefined });

  for (let k = 0; k < PRE; k++) await shoot();
  await page.evaluate(() => document.getElementById('btnShoot').click());
  let pending = 1;
  for (let i = 0; i < MAX_FRAMES; i++) {
    pending = await page.evaluate((dt) => window.__pump(dt), DT);
    await shoot();
    const done = await page.evaluate(() => !!(window.ACE_SHOT && window.ACE_SHOT.done));
    if (done && pending === 0) { s.done = true; break; }
  }
  for (let k = 0; k < POST; k++) await shoot();
  await browser.close();
  fs.writeFileSync(join(__dirname, 'out', `${OUTDIR}-summary.json`), JSON.stringify({ ...s, errors: errors.slice(0, 4) }, null, 1));
  console.log(OUTDIR, 'frames:', s.frames, 'done:', s.done, 'errs:', errors.length);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
