// record-video.cjs \u2014 Render a scenarios file into a full narrated video.
//
// Reads a scenarios JSON (e.g. kball-scenarios.json), walks each scene, records
// deterministic PNG frames using the same virtualized-rAF trick as record-shot.cjs,
// overlays scene titles + annotations, and stitches everything with ffmpeg into
// a single mp4. Optional voiceover MP3s per scene can be supplied via ./voice/<name>.mp3.
//
//   node record-video.cjs                              # all scenes -> out/kball-full.mp4
//   SCENARIOS=kball-scenarios.json OUT=out/kball.mp4 node record-video.cjs
//   SCENE=03-break-results node record-video.cjs        # render one scene only
//
// Requires: playwright-core, ffmpeg on PATH, chromium-browser (already used by record-shot.cjs).

const { chromium } = require('playwright-core');
const { join } = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { execFileSync } = require('child_process');

const SCENARIOS = process.env.SCENARIOS || 'kball-scenarios.json';
const OUT       = process.env.OUT || join('out', 'kball-full.mp4');
const ONLY      = process.env.SCENE || null;
const FPS       = +(process.env.FPS || 30);

const scenarios = JSON.parse(fs.readFileSync(join(__dirname, SCENARIOS), 'utf8'));
const framesRoot = join(__dirname, 'out', 'video-frames');
fs.rmSync(framesRoot, { recursive: true, force: true });
fs.mkdirSync(framesRoot, { recursive: true });

function installVClock() {
  let vnow = 0, nextId = 1;
  const cbs = new Map();
  window.requestAnimationFrame = (cb) => { const id = nextId++; cbs.set(id, cb); return id; };
  window.cancelAnimationFrame  = (id) => cbs.delete(id);
  window.__pump = (dt) => {
    vnow += dt;
    const due = [...cbs];
    cbs.clear();
    for (const [, cb] of due) { try { cb(vnow); } catch (e) { /* ignore */ } }
    return cbs.size;
  };
}

function applyAnnotations(annotations) {
  const svg = document.querySelector('#poolTable svg, #tableSvg, svg');
  if (!svg) return;
  const layer = svg.querySelector('#layer-annotations') || svg;
  // clear previous
  [...layer.querySelectorAll('.ace-anno')].forEach(n => n.remove());
  for (const a of (annotations || [])) {
    if (a.type === 'text') {
      const t = document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('class','ace-anno');
      t.setAttribute('x', a.at[0]); t.setAttribute('y', a.at[1]);
      t.setAttribute('fill','#f5d76e'); t.setAttribute('font-size','2.4');
      t.setAttribute('font-weight','700'); t.setAttribute('text-anchor','middle');
      t.textContent = a.label;
      layer.appendChild(t);
    } else if (a.type === 'arrow') {
      const l = document.createElementNS('http://www.w3.org/2000/svg','line');
      l.setAttribute('class','ace-anno');
      l.setAttribute('x1', a.from[0]); l.setAttribute('y1', a.from[1]);
      l.setAttribute('x2', a.to[0]);   l.setAttribute('y2', a.to[1]);
      l.setAttribute('stroke','#f5d76e'); l.setAttribute('stroke-width','0.4');
      l.setAttribute('marker-end','url(#arrowhead)');
      layer.appendChild(l);
      if (a.label) {
        const t = document.createElementNS('http://www.w3.org/2000/svg','text');
        t.setAttribute('class','ace-anno');
        t.setAttribute('x', (a.from[0]+a.to[0])/2);
        t.setAttribute('y', (a.from[1]+a.to[1])/2 - 1.5);
        t.setAttribute('fill','#f5d76e'); t.setAttribute('font-size','2');
        t.setAttribute('text-anchor','middle');
        t.textContent = a.label;
        layer.appendChild(t);
      }
    } else if (a.type === 'highlight' && a.ball) {
      const el = document.getElementById('ball-' + a.ball);
      if (el) {
        const cx = +el.getAttribute('cx') || 0;
        const cy = +el.getAttribute('cy') || 0;
        const r  = 1.6;
        const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('class','ace-anno');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
        c.setAttribute('fill','none'); c.setAttribute('stroke','#f5d76e');
        c.setAttribute('stroke-width','0.4');
        c.setAttribute('stroke-dasharray','1,0.8');
        layer.appendChild(c);
      }
    } else if (a.type === 'pocketCall') {
      const target = document.querySelector(`[data-pocket="${a.pocket}"]`);
      if (target) {
        const cx = +target.getAttribute('cx');
        const cy = +target.getAttribute('cy');
        const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('class','ace-anno');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 5);
        c.setAttribute('fill','none'); c.setAttribute('stroke','#7ee787');
        c.setAttribute('stroke-width','0.6');
        layer.appendChild(c);
        if (a.label) {
          const t = document.createElementNS('http://www.w3.org/2000/svg','text');
          t.setAttribute('class','ace-anno');
          t.setAttribute('x', cx); t.setAttribute('y', cy + 8);
          t.setAttribute('fill','#7ee787'); t.setAttribute('font-size','2.2');
          t.setAttribute('font-weight','700'); t.setAttribute('text-anchor','middle');
          t.textContent = a.label;
          layer.appendChild(t);
        }
      }
    }
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox','--disable-gpu','--force-color-profile=srgb']
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => localStorage.setItem('ace-tour-completed','true'));
  await ctx.addInitScript(installVClock);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[pageerror]', e.message));

  const partClips = [];
  for (const scene of scenarios) {
    if (ONLY && scene.name !== ONLY) continue;
    console.log(`\u2192 ${scene.name}: ${scene.title || ''}`);
    const dir = join(framesRoot, scene.name);
    fs.mkdirSync(dir, { recursive: true });
    const url = pathToFileURL(join(__dirname, 'index.html')).href + '#' + scene.state;
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '.tool-palette,#shotInfo,.cue-controls-panel,.toast-notification{display:none !important;}' });
    await page.evaluate(applyAnnotations, scene.annotations || []);

    const clip = await page.evaluate(() => {
      const el = document.querySelector('#poolTable, #tableSvg, svg');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y));
      const w = Math.min(Math.ceil(r.width), 1280 - x);
      const h = Math.min(Math.ceil(r.height), 720 - y);
      return (w > 200 && h > 100) ? { x, y, width: w, height: h } : null;
    });

    const totalFrames = Math.max(30, Math.round((scene.duration_ms || 4000) * FPS / 1000));
    // First 20% of scene: just hold the annotated diagram.
    // Then trigger shoot() (if present) and pump virtualized rAF ticks until done.
    const holdFrames = Math.round(totalFrames * 0.2);
    let idx = 0;
    for (let i = 0; i < holdFrames; i++) {
      await page.screenshot({ path: join(dir, `f${String(idx++).padStart(4,'0')}.png`), clip: clip || undefined });
    }
    const btn = await page.$('#btnShoot');
    if (btn) await btn.click().catch(()=>{});
    let pending = 1;
    for (let i = 0; i < totalFrames - holdFrames; i++) {
      pending = await page.evaluate((dt) => window.__pump(dt), 1000 / FPS);
      await page.screenshot({ path: join(dir, `f${String(idx++).padStart(4,'0')}.png`), clip: clip || undefined });
    }

    // Encode this scene to an intermediate mp4
    const clipMp4 = join(framesRoot, `${scene.name}.mp4`);
    execFileSync('ffmpeg', ['-y','-framerate', String(FPS),
      '-i', join(dir, 'f%04d.png'),
      '-vf', `pad=ceil(iw/2)*2:ceil(ih/2)*2,drawtext=text='${(scene.title||'').replace(/'/g,'\\\\\\'')}'` +
             `:fontcolor=white:fontsize=32:x=(w-tw)/2:y=20:box=1:boxcolor=black@0.5:boxborderw=8`,
      '-c:v','libx264','-pix_fmt','yuv420p','-preset','veryfast','-crf','20', clipMp4],
      { stdio: 'inherit' });
    partClips.push(clipMp4);
  }

  await browser.close();

  // Concat all parts into the final mp4
  const listPath = join(framesRoot, 'concat.txt');
  fs.writeFileSync(listPath, partClips.map(p => `file '${p.replace(/'/g,\"'\\\\''\")}'`).join('\n'));
  fs.mkdirSync(join(__dirname, 'out'), { recursive: true });
  execFileSync('ffmpeg', ['-y','-f','concat','-safe','0','-i', listPath, '-c','copy', OUT], { stdio: 'inherit' });
  console.log('\u2713 wrote', OUT);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
