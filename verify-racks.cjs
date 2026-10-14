// Rack behaviour, driven through the REAL page in a browser.
//
// Covers the four rack fixes rescued from the stale working copy in
// aiming_diagrams_work (see the archive note in projects/_archive):
//
//   1. 10-Ball is a WPA rack - 2 and 3 in the back corners (random side), 1 on
//      the apex, 10 in the centre.
//   2. Straight Pool (14.1) and One Pocket get a full 15-ball random rack,
//      instead of falling into the 8-Ball branch that pins 8 to the centre.
//   3. randomRack clears all of 1-15 plus the generic 'gray' ball, not just the
//      new mode's set, so 10-15 cannot strand on the table after switching to a
//      smaller game.
//   4. A USER mode change re-racks, but loading a saved state does not -
//      applyState assigns gameModeSelect.value without dispatching 'change', so
//      a loaded diagram survives. The assertions below separate those two cases
//      deliberately: a test that cannot tell them apart would pass either way.
//
// Uses the shared harness-browser launcher (playwright-core; CHROMIUM_PATH wins when set).
//
//   node verify-racks.cjs

const { launchHarnessBrowser } = require('./harness-browser.cjs');
const { join } = require('path');
const { pathToFileURL } = require('url');

const base = pathToFileURL(join(__dirname, 'index.html')).href;
const near = (a, b) => Math.abs(a - b) < 1e-4;
const ALL15 = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15'];

let checks = 0, failures = 0;
function check(ok, msg) {
  checks++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
}

/** A user-driven mode change: set the control and dispatch 'change', as the UI does. */
async function setMode(page, id) {
  await page.evaluate((id) => {
    const sel = document.getElementById('gameModeSelect');
    sel.value = id;
    sel.dispatchEvent(new Event('change'));
  }, id);
}
async function rack(page) {
  await page.evaluate(() => document.getElementById('btnRandomRack').click());
  await page.waitForTimeout(60);
}
const balls = (page) => page.evaluate(() => window.DEBUG.balls());
const ids = (p, list) => list.filter((b) => p[b] && typeof p[b].x === 'number');

(async () => {
  const browser = await launchHarnessBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${base}?empty=1`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(700);   // let the app's own init (createBalls + listeners) settle

  // ---------- 1. 10-ball: WPA rack, 2 and 3 in the back corners ----------
  const sides = new Set();
  for (let run = 0; run < 6; run++) {
    await setMode(page, '10ball');
    await rack(page);
    const p = await balls(page);
    const ten = ids(p, ['1','2','3','4','5','6','7','8','9','10']);
    const maxX = Math.max(...ten.map((b) => p[b].x));
    const minX = Math.min(...ten.map((b) => p[b].x));
    // The back row shares one x; its corners are that row's y-extremes.
    const backRow = ten.filter((b) => near(p[b].x, maxX)).sort((a, b) => p[a].y - p[b].y);
    const corners = [backRow[0], backRow[backRow.length - 1]].sort();
    const allYs = ten.map((b) => p[b].y);
    const apex = ten.filter((b) => near(p[b].x, minX));

    check(ten.length === 10, `10-ball run ${run}: all 10 balls placed (got ${ten.length})`);
    check(backRow.length === 4, `10-ball run ${run}: back row holds 4 balls (got ${backRow.length})`);
    check(corners.join(',') === '2,3', `10-ball run ${run}: 2 and 3 are the back-row corners (got ${corners.join(',')})`);
    check(apex.length === 1 && apex[0] === '1', `10-ball run ${run}: 1-ball at the apex`);
    check(near(p['10'].y, p['1'].y), `10-ball run ${run}: 10-ball is the centre row`);
    check([...new Set([Math.max(...allYs), Math.min(...allYs)])].sort().join(',')
      === [p['2'].y, p['3'].y].sort().join(','),
      `10-ball run ${run}: 2 and 3 occupy the two extreme corner rows`);
    sides.add([backRow[0], backRow[backRow.length - 1]]
      .map((b) => `${b}@${p[b].y > p['1'].y ? 'bottom' : 'top'}`).sort().join(' '));
  }
  check(sides.size > 1, `10-ball: the corner side is randomised across racks (${[...sides].join(' | ')})`);

  // ---------- 2. Straight Pool (14.1) and One Pocket: full 15-ball rack ----------
  for (const mode of ['14.1', '1pocket']) {
    await setMode(page, mode);
    await rack(page);
    const p = await balls(page);
    const on = ids(p, ALL15);
    const xs = new Set(on.map((b) => p[b].x.toFixed(3)));
    const backRow = on.filter((b) => near(p[b].x, Math.max(...on.map((x) => p[x].x))));
    check(on.length === 15, `${mode}: full 15-ball rack placed (got ${on.length})`);
    check(xs.size === 5, `${mode}: five rows (got ${xs.size})`);
    check(backRow.length === 5, `${mode}: back row holds 5 balls (got ${backRow.length})`);
  }
  // ...and it must NOT be the 8-ball rack wearing another name: the 8-ball
  // branch pins 8 to the centre on every rack, which this rules out.
  const centres = new Set();
  const cornerPairs = new Set();
  for (let run = 0; run < 6; run++) {
    await setMode(page, '14.1');
    await rack(page);
    const p = await balls(page);
    const on = ids(p, ALL15);
    const apexX = Math.min(...on.map((b) => p[b].x));
    const spacing = (Math.max(...on.map((b) => p[b].x)) - apexX) / 4;
    const apexY = p[on.find((b) => near(p[b].x, apexX))].y;
    centres.add(on.find((b) => near(p[b].x, apexX + 2 * spacing) && near(p[b].y, apexY)));
    const backRow = on.filter((b) => near(p[b].x, apexX + 4 * spacing)).sort((a, b) => p[a].y - p[b].y);
    cornerPairs.add([backRow[0], backRow[backRow.length - 1]].sort().join(','));
  }
  check(!(centres.size === 1 && centres.has('8')),
    `14.1: rack is randomised, not the 8-ball rack - centre ball across 6 racks: ${[...centres].join(',')}`);
  check(cornerPairs.size > 1, `14.1: the back corners vary across racks (${[...cornerPairs].join(' | ')})`);

  // ---------- 8-ball regression: still the 8-ball rack ----------
  await setMode(page, '8ball');
  await rack(page);
  const p8 = await balls(page);
  const on8 = ids(p8, ALL15);
  const spacing8 = (Math.max(...on8.map((b) => p8[b].x)) - p8['1'].x) / 4;
  const backRow8 = on8.filter((b) => near(p8[b].x, Math.max(...on8.map((x) => p8[x].x))))
    .sort((a, b) => p8[a].y - p8[b].y);
  const corners8 = [backRow8[0], backRow8[backRow8.length - 1]];
  const solids = ['1','2','3','4','5','6','7'];
  const stripes = ['9','10','11','12','13','14','15'];
  check(on8.length === 15, `8-ball: full 15-ball rack placed (got ${on8.length})`);
  check(near(p8['8'].y, p8['1'].y) && near(p8['8'].x, p8['1'].x + 2 * spacing8),
    `8-ball: 8 still in the rack centre`);
  check(backRow8.length === 5 && corners8.filter((b) => solids.includes(b)).length === 1
    && corners8.filter((b) => stripes.includes(b)).length === 1,
    `8-ball: one solid + one stripe on the back corners (${corners8.slice().sort().join(',')})`);

  // ---------- 3. A rack change clears the previous frame's balls ----------
  await setMode(page, '9ball');
  await rack(page);
  const p9 = await balls(page);
  const leftovers = ['10','11','12','13','14','15'].filter((b) => p9[b] && typeof p9[b].x === 'number');
  check(leftovers.length === 0,
    `switch 8-Ball -> 9-Ball: no 10-15 stranded (leftovers: ${leftovers.join(',') || 'none'})`);
  check(ids(p9, ['1','2','3','4','5','6','7','8','9']).length === 9, `switch: all 9 balls racked`);

  // ---------- 4. user mode change vs saved-state load ----------
  // Loading a saved game goes through applyState, which assigns .value WITHOUT
  // dispatching 'change'. That is the whole distinction this section tests.
  const SAVED = 'v1|cue:20,25|1:70,30|p:cbr|b:1|m:9ball|f:6|e:0.0,0.0|s:auto';
  const ps = await ctx.newPage();
  const errs2 = [];
  ps.on('pageerror', (e) => errs2.push(String(e)));
  await ps.goto(`${base}?empty=1#${SAVED}`, { waitUntil: 'load', timeout: 30000 });
  await ps.waitForTimeout(700);

  const s1 = await balls(ps);
  const placed1 = ids(s1, ALL15);
  check(placed1.length === 1 && placed1[0] === '1',
    `saved-state load: only the saved ball is on the table (got ${placed1.join(',') || 'none'})`);
  check(near(s1['1'].x, 70) && near(s1['1'].y, 30),
    `saved-state load: ball 1 keeps its saved position (${s1['1'].x}, ${s1['1'].y})`);

  // A bare assignment, no event - exactly what applyState does.
  await ps.evaluate(() => { document.getElementById('gameModeSelect').value = '8ball'; });
  await ps.waitForTimeout(150);
  const s2 = await balls(ps);
  const placed2 = ids(s2, ALL15);
  check(placed2.length === 1 && near(s2['1'].x, 70) && near(s2['1'].y, 30),
    `programmatic .value, no event: the arrangement survives (on table: ${placed2.join(',') || 'none'})`);
  check(await ps.inputValue('#gameModeSelect') === '8ball',
    `programmatic .value took effect on the control (value=${await ps.inputValue('#gameModeSelect')})`);

  // A user change - value + 'change' event - must re-rack.
  await ps.evaluate(() => {
    const sel = document.getElementById('gameModeSelect');
    sel.value = '8ball';
    sel.dispatchEvent(new Event('change'));
  });
  await ps.waitForTimeout(150);
  const s3 = await balls(ps);
  const placed3 = ids(s3, ALL15);
  check(placed3.length === 15, `user mode change: re-racks all 15 (got ${placed3.length})`);
  check(!(near(s3['1'].x, 70) && near(s3['1'].y, 30)),
    `user mode change: the saved arrangement is gone (ball 1 now ${s3['1'].x}, ${s3['1'].y})`);
  check(errs2.length === 0, `saved-state page errors: ${errs2.length ? errs2.join(' | ') : 'none'}`);

  check(errs.length === 0, `page errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await browser.close();
  console.log(`\n${checks - failures}/${checks} rack assertions passed`);
  process.exit(failures === 0 ? 0 : 1);
})();
