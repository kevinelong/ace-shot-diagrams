const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const input = process.argv[2];
  if (!input) throw new Error('usage: render-thumbnails.cjs items.json');
  const items = JSON.parse(fs.readFileSync(input, 'utf8'));
  const out = process.env.ACE_OUT || '/tmp/ace-thumbs';
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1214 },
    deviceScaleFactor: 1
  });
  await page.goto('https://codeonline.io/ace/?empty=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  for (const item of items) {
    const dataUrl = await page.evaluate(async (state) => {
      applyState(decodeState(state));
      await new Promise((resolve) => setTimeout(resolve, 100));
      const OUT_W = 1200;
      const OUT_H = 683;
      const SCALE = 2;
      const svg = createExportSVG();
      addShareWatermark(svg);
      svg.setAttribute('viewBox', '-8 -8 116 66');
      svg.setAttribute('width', String(OUT_W * SCALE));
      svg.setAttribute('height', String(OUT_H * SCALE));
      const xml = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const hi = document.createElement('canvas');
      hi.width = OUT_W * SCALE;
      hi.height = OUT_H * SCALE;
      hi.getContext('2d').drawImage(img, 0, 0, hi.width, hi.height);
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(hi, 0, 0, OUT_W, OUT_H);
      return canvas.toDataURL('image/png');
    }, item.state);
    fs.writeFileSync(
      path.join(out, item.token + '.png'),
      Buffer.from(dataUrl.split(',')[1], 'base64')
    );
    console.log('rendered', item.token);
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
