import { test, expect } from '@playwright/test';

/**
 * Coarse interaction budget. These are gross-regression guards, not a benchmark:
 * CI hardware varies, so thresholds leave generous headroom.
 */

test.describe('Performance budgets', () => {
  test('editor reaches a usable state and recalculates aim quickly', async ({ page }) => {
    const started = Date.now();
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });
    const readyMs = Date.now() - started;
    expect(readyMs, 'editor ready').toBeLessThan(5000);

    const aimMs = await page.evaluate(() => {
      const t0 = performance.now();
      // @ts-ignore - app debug API
      window.DEBUG.placeBall('1', 60, 25);
      // @ts-ignore
      window.DEBUG.selectBall('1');
      // @ts-ignore
      window.DEBUG.selectPocket('corner-tr');
      return performance.now() - t0;
    });
    expect(aimMs, 'aim recalculation').toBeLessThan(1000);

    const rackMs = await page.evaluate(() => {
      const t0 = performance.now();
      document.getElementById('btnRandomRack')?.click();
      return performance.now() - t0;
    });
    expect(rackMs, 'rack click handling').toBeLessThan(1000);
  });
});
