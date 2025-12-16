import { test, expect } from '@playwright/test';

/**
 * Rack Start Behavior Tests
 *
 * Tests the default app behavior of starting with an 8-ball rack
 * and the ?empty=1 parameter for empty table start.
 */

test.describe('Rack Start Behavior', () => {

  test.beforeEach(async ({ page }) => {
    // Skip the first-time user tour
    await page.addInitScript(() => {
      localStorage.setItem('ace-tour-completed', 'true');
    });
  });

  test('should display 8-ball rack on initial load', async ({ page }) => {
    // Navigate without empty parameter - should show rack
    await page.goto('/');
    await page.waitForTimeout(300);

    // All 15 object balls should be on table
    for (let i = 1; i <= 15; i++) {
      const ball = page.locator(`#ball-${i}`);
      await expect(ball).toBeVisible();
    }

    // Cue ball should be visible (in kitchen area)
    const cueBall = page.locator('#ball-cue');
    await expect(cueBall).toBeVisible();

    // Ghost ball should be visible (aimed at head ball)
    const ghostBall = page.locator('#ball-ghost');
    await expect(ghostBall).toBeVisible();
  });

  test('should position cue ball in kitchen for break', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // Cue ball should be in the left quarter of the table (kitchen)
    const cueBall = page.locator('#ball-cue');
    const table = page.locator('#pool-table-svg');

    const cueBallBox = await cueBall.boundingBox();
    const tableBox = await table.boundingBox();

    expect(cueBallBox).toBeTruthy();
    expect(tableBox).toBeTruthy();

    // Cue ball X should be in left 30% of table
    const relativeX = (cueBallBox!.x - tableBox!.x) / tableBox!.width;
    expect(relativeX).toBeLessThan(0.35);
  });

  test('should have 8-ball in center of rack', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // 8-ball should be visible
    const eightBall = page.locator('#ball-8');
    await expect(eightBall).toBeVisible();

    // 8-ball should be roughly in the center-right area (rack position)
    const eightBallBox = await eightBall.boundingBox();
    const tableBox = await page.locator('#pool-table-svg').boundingBox();

    expect(eightBallBox).toBeTruthy();
    expect(tableBox).toBeTruthy();

    // 8-ball should be in right half of table (where rack is)
    const relativeX = (eightBallBox!.x - tableBox!.x) / tableBox!.width;
    expect(relativeX).toBeGreaterThan(0.5);
  });

  test('should skip rack when ?empty=1 parameter present', async ({ page }) => {
    // Navigate with empty parameter
    await page.goto('/?empty=1');
    await page.waitForTimeout(300);

    // No object balls should be on table
    for (let i = 1; i <= 15; i++) {
      const ball = page.locator(`#ball-${i}`);
      // Ball elements exist but should not be positioned on table
      // They should be in the palette or hidden
      const isOnTable = await ball.evaluate(el => {
        // Check if ball has position on table (has transform or is in SVG)
        const style = window.getComputedStyle(el);
        const parent = el.parentElement;
        // If in palette, not "on table"
        return parent?.id !== 'paletteBallGrid' && parent?.id !== 'paletteBallSpecial';
      });
      expect(isOnTable).toBe(false);
    }
  });

  test('should have all balls in palette when empty', async ({ page }) => {
    await page.goto('/?empty=1');
    await page.waitForTimeout(300);

    // Cue ball should be in palette
    const cueBallInPalette = page.locator('#palette-balls .ball[data-ball-id="cue"]');
    await expect(cueBallInPalette).toBeVisible();

    // Ball 1 should be in palette
    const ball1InPalette = page.locator('#palette-balls .ball[data-ball-id="1"]');
    await expect(ball1InPalette).toBeVisible();

    // Ball 8 should be in palette
    const ball8InPalette = page.locator('#palette-balls .ball[data-ball-id="8"]');
    await expect(ball8InPalette).toBeVisible();
  });

  test('should set follow spin for break shot', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // Contact point should show top spin (follow) position
    const contactPoint = page.locator('#contact-point');
    await expect(contactPoint).toBeVisible();

    // Top spin = negative Y coordinate (above center)
    const cy = await contactPoint.getAttribute('cy');
    const cyValue = parseFloat(cy || '0');
    expect(cyValue).toBeLessThan(0);
  });

  test('should set power to 7 for break shot', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // Power slider should be set to 7
    const forceSlider = page.locator('#forceSlider');
    const sliderValue = await forceSlider.inputValue();
    expect(sliderValue).toBe('7');
  });

  test('should allow Rack button to reset to rack', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // First, shoot to scatter balls
    await page.locator('#btnShoot').click();
    await page.waitForTimeout(3000);

    // Click Rack button
    await page.locator('#btnRandomRack').click();
    await page.waitForTimeout(500);

    // All 15 balls should be back on table
    for (let i = 1; i <= 15; i++) {
      const ball = page.locator(`#ball-${i}`);
      await expect(ball).toBeVisible();
    }
  });
});
