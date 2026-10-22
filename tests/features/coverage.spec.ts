import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Chromium V8 coverage for the inline editor core. This is a raw coverage
 * artifact + summary, not an Istanbul threshold gate; it gives a stable signal
 * without adding a source-map toolchain to the zero-dependency page.
 */

test.describe('Coverage', () => {
  test('captures V8 coverage for core editor interactions', async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    await page.evaluate(() => {
      // @ts-ignore - app debug API
      window.DEBUG.placeBall('1', 60, 25);
      // @ts-ignore
      window.DEBUG.selectBall('1');
      // @ts-ignore
      window.DEBUG.selectPocket('corner-tr');
    });

    const coverage = await page.coverage.stopJSCoverage();
    const app = coverage.find(entry => entry.url.endsWith('/index.html') || entry.url.endsWith('/'));
    expect(app, 'coverage entry for the app').toBeTruthy();

    const functions = app?.functions || [];
    const executedBytes = functions.reduce(
      (sum, fn) => sum + fn.ranges.reduce((inner, range) => inner + (range.endOffset - range.startOffset), 0),
      0
    );

    mkdirSync('coverage', { recursive: true });
    writeFileSync('coverage/index-coverage.json', JSON.stringify({
      url: app?.url,
      functions: functions.length,
      executedBytes,
      ranges: functions.length,
    }, null, 2));

    expect(executedBytes, 'some editor code must execute').toBeGreaterThan(0);
  });
});
