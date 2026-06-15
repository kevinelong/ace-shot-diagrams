// App-level shot test harness: drives the REAL app solver (direct/bank/kick/
// combo aim) for each set-up shot, fires it, and asserts the target ball drops
// in the intended pocket. Unlike verify-rust-parity.js (which feeds a geometric
// aim straight to the core), this exercises the aim solver end-to-end — the only
// way to validate throw compensation for bank/kick/combo, whose aim is computed,
// not geometric.
//
//   node verify-shots.cjs            run all cases
// Uses playwright-core + system chromium (no @playwright/test browser download).
const { chromium } = require('playwright-core');
const { join } = require('path');
const { pathToFileURL } = require('url');

const base = pathToFileURL(join(__dirname, 'index.html')).href;

// pocket codes mirror the URL scheme: c*=corner, s*=side
// each case: name, state (URL hash body), expectBall, expectPocket
const CASES = [
  // --- direct (sanity: already pass) ---
  { name: 'direct-cut-30', state: 'cue:56.8,6.5|1:70,30|p:cbr|b:1|m:9ball|f:6|e:0.0,0.0|s:auto', ball: '1', pocket: 'corner-br' },
  { name: 'direct-cut-45', state: 'cue:62.9,4.3|1:70,30|p:cbr|b:1|m:9ball|f:7|e:0.0,0.0|s:auto', ball: '1', pocket: 'corner-br' },
  // --- bank: OB banks off a rail to a pocket (s:bank forces the solver) ---
  { name: 'bank-top-to-bl', state: 'cue:60,40|1:50,25|p:cbl|b:1|m:9ball|f:8|e:0.0,0.0|s:bank', ball: '1', pocket: 'corner-bl' },
  { name: 'bank-bottom-to-tl', state: 'cue:60,10|1:50,25|p:ctl|b:1|m:9ball|f:8|e:0.0,0.0|s:bank', ball: '1', pocket: 'corner-tl' },
  // --- kick: cue kicks off a rail then pots the OB (s:kick) ---
  { name: 'kick-1rail', state: 'cue:20,25|1:70,38|p:cbr|b:1|m:9ball|f:8|e:0.0,0.0|s:kick', ball: '1', pocket: 'corner-br' },
  // --- combo: cue hits helper which pots the target (s:combo) ---
  { name: 'combo-2ball', state: 'cue:62,26|2:75,34|1:85,40|p:cbr|b:1|m:9ball|f:8|e:0.0,0.0|s:combo', ball: '1', pocket: 'corner-br' },
];

async function runCase(ctx, c) {
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${base}?empty=1&r=t#v1|${c.state}`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1200);
  // did the solver find a viable aim? (ghost placed)
  const aimed = await page.evaluate(() => !!(document.getElementById('btnShoot')));
  await page.evaluate(() => document.getElementById('btnShoot').click());
  // wait for physics done (poll up to ~9s)
  let done = false;
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(100);
    done = await page.evaluate(() => !!(window.ACE_SHOT && window.ACE_SHOT.done));
    if (done) break;
  }
  const res = await page.evaluate((ball) => {
    const s = window.ACE_SHOT;
    if (!s) return { none: true };
    const f = s.final && s.final[ball];
    const pocket = (s.events || []).filter(e => e.type === 'pocket');
    const obPot = pocket.find(e => e.id === ball);
    const scratch = pocket.find(e => e.id === 'cue');
    return { pocketed: !!(f && f.pocketed), pocketEvent: obPot ? obPot.pocket : null, scratch: !!scratch, nEvents: (s.events || []).length };
  }, c.ball);
  await page.close();
  return { ...c, done, aimed, errs: errs.length, ...res };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 640 } });
  await ctx.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'));
  let pass = 0;
  for (const c of CASES) {
    const r = await runCase(ctx, c);
    const ok = r.pocketed && r.pocketEvent === c.pocket && !r.scratch && r.errs === 0;
    if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(16)}  pot=${r.pocketEvent || '-'} want=${c.pocket} scratch=${r.scratch} ev=${r.nEvents} errs=${r.errs}`);
  }
  await browser.close();
  console.log(`\n${pass}/${CASES.length} shots potted as intended`);
  process.exit(pass === CASES.length ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
