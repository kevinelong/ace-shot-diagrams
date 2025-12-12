const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 1100 });

  const filePath = 'file://' + path.resolve('./index.html');
  await page.goto(filePath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'screenshot.png',
    clip: { x: 0, y: 0, width: 1200, height: 1050 }
  });

  console.log('Screenshot saved!');
  await browser.close();
})();
