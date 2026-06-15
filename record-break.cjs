// Record a break shot as a smooth frame sequence for side-by-side comparison
// with real overhead break videos.
//
// The shot animation (cue stroke + animateShotWasm playback) is driven entirely
// off the requestAnimationFrame timestamp. page.screenshot() is ~1s each, far
// slower than real-time, so capturing the LIVE animation samples it far too
// coarsely. Instead we VIRTUALIZE the clock: override rAF to a manual queue and
// pump it by a fixed dt per frame, so the animation advances exactly one frame
// per screenshot no matter how long the screenshot takes. Result: deterministic,
// smooth 30fps capture. Frames land in out/frames/ for ffmpeg.
const { chromium } = require('playwright-core');
const { join } = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

const indexUrl = pathToFileURL(join(__dirname, 'index.html')).href + '?r=t2';
const OUT = join(__dirname, 'out');
const FRAMES = join(OUT, 'frames');
fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });

const FPS = 30;
const DT = 1000 / FPS;
const MAX_FRAMES = 240;          // 8s playback cap
const PRE_FRAMES = 12;           // hold on the rack before the break
const POST_FRAMES = 24;          // hold on the settled table

// installed before any page script runs: a manual rAF clock
function installVClock() {
  let vnow = 0, nextId = 1;
  const cbs = new Map();
  window.requestAnimationFrame = (cb) => { const id = nextId++; cbs.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { cbs.delete(id); };
  // advance virtual time by dt and fire all callbacks queued as of now with the
  // new timestamp; callbacks that re-queue run on the NEXT pump. returns the
  // number still pending after this pump.
  window.__pump = (dt) => {
    vnow += dt;
    const due = [...cbs]; cbs.clear();
    for (const [, cb] of due) { try { cb(vnow); } catch (e) { /* swallow */ } }
    return cbs.size;
  };
  window.__vnow = () => vnow;
}

(async () => {
  const summary = { frames: 0, done: false, pending: null };
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({ viewport: { width: 1100, height: 640 } });
  await context.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'));
  await context.addInitScript(installVClock);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(indexUrl, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500); // auto-rack ('Rack set') — uses real setTimeout

  // hide the floating UI so the clip is a clean overhead table (the SHOT INFO
  // panel otherwise covers the rack/foot-spot where the break happens)
  await page.addStyleTag({ content:
    '.tool-palette,#shotInfo,.cue-controls-panel,.toast-notification{display:none !important;}' });

  // crop to the table region so the clip is mostly felt
  const clip = await page.evaluate(() => {
    const el = document.querySelector('#poolTable, #tableSvg, svg');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y));
    const w = Math.min(Math.ceil(r.width), 1100 - x), h = Math.min(Math.ceil(r.height), 640 - y);
    return (w > 200 && h > 100) ? { x, y, width: w, height: h } : null;
  });
  const shoot = async () => {
    const f = join(FRAMES, `f${String(summary.frames++).padStart(4, '0')}.png`);
    await page.screenshot({ path: f, clip: clip || undefined });
  };

  for (let k = 0; k < PRE_FRAMES; k++) await shoot();

  // fire the break, then drive the animation one virtual frame per screenshot
  await page.evaluate(() => document.getElementById('btnShoot').click());
  let pending = 1;
  for (let i = 0; i < MAX_FRAMES; i++) {
    pending = await page.evaluate((dt) => window.__pump(dt), DT);
    await shoot();
    const done = await page.evaluate(() => !!(window.ACE_SHOT && window.ACE_SHOT.done));
    if (done && pending === 0) { summary.done = true; break; }
  }
  for (let k = 0; k < POST_FRAMES; k++) await shoot();

  summary.pending = pending;
  summary.errors = errors.slice(0, 4);
  summary.fps = FPS;
  await browser.close();
  fs.writeFileSync(join(OUT, 'record-summary.json'), JSON.stringify(summary, null, 1));
  console.log('frames:', summary.frames, 'done:', summary.done, 'pending:', summary.pending, 'errs:', errors.length);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
