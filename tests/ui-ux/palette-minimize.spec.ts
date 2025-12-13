import { test, expect } from '@playwright/test';

/**
 * Test Suite: Palette Minimize Functionality
 * 
 * Tests that clicking minimize buttons on all palettes works correctly
 * and doesn't trigger unintended interactions with the table beneath.
 * 
 * Tests at multiple screen resolutions:
 * - 1920x1080 (Full HD Desktop)
 * - 1366x768 (Common Laptop)
 * - 1536x864 (Scaled Display)
 * - 2560x1440 (2K Desktop)
 * - 1280x720 (HD)
 */

const RESOLUTIONS = [
  { width: 1920, height: 1080, name: 'Full HD Desktop' },
  { width: 1366, height: 768, name: 'Common Laptop' },
  { width: 1536, height: 864, name: 'Scaled Display' },
  { width: 2560, height: 1440, name: '2K Desktop' },
  { width: 1280, height: 720, name: 'HD' }
];

const PALETTES = [
  { id: 'palette-balls', name: 'Balls', hasRestore: true },
  { id: 'palette-cue', name: 'Cue Control', hasRestore: true },
  { id: 'palette-legend', name: 'Legend', hasRestore: true },
  { id: 'palette-game', name: 'Game', hasRestore: true },
  { id: 'palette-shot', name: 'Shot Info', hasRestore: true },
  { id: 'palette-actions', name: 'Actions', hasRestore: false },
  { id: 'palette-save', name: 'Save', hasRestore: false },
  { id: 'palette-aids', name: 'Aids', hasRestore: false }
];

test.describe('Palette Minimize - Cross Resolution Tests', () => {
  for (const resolution of RESOLUTIONS) {
    test.describe(`Resolution: ${resolution.name} (${resolution.width}x${resolution.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ 
          width: resolution.width, 
          height: resolution.height 
        });
        await page.goto('/');
        await page.waitForSelector('#pool-table-svg', { state: 'visible' });
        
        // Wait for initial setup
        await page.waitForTimeout(500);
      });

      for (const palette of PALETTES) {
        test(`${palette.name} palette minimize button should not trigger table interactions`, async ({ page }) => {
          // Ensure palette is visible
          const paletteElement = page.locator(`#${palette.id}`);
          await expect(paletteElement).toBeVisible();

          // Get initial state of balls on table
          const initialBallCount = await page.locator('.ball').count();
          
          // Place a ball on table if none exist (for testing ball movement prevention)
          if (initialBallCount === 0) {
            const cueBall = page.locator('#ball-cue');
            await cueBall.dragTo(page.locator('#pool-table-svg'), {
              targetPosition: { x: 400, y: 300 }
            });
            await page.waitForTimeout(300);
          }

          // Get ball positions before clicking minimize
          const ballPositionsBefore = await page.evaluate(() => {
            const positions: any = {};
            document.querySelectorAll('.ball').forEach((ball: any) => {
              positions[ball.id] = {
                left: ball.style.left,
                top: ball.style.top
              };
            });
            return positions;
          });

          // Find and click the minimize button
          const minimizeBtn = paletteElement.locator('.palette-btn.minimize');
          await expect(minimizeBtn).toBeVisible();
          
          // Take screenshot before click
          await page.screenshot({ 
            path: `tests/ui-ux/screenshots/${palette.id}-before-minimize-${resolution.width}x${resolution.height}.png` 
          });

          // Click the minimize button
          await minimizeBtn.click();
          await page.waitForTimeout(300);

          // Verify palette is minimized (body should be hidden)
          const paletteBody = paletteElement.locator('.palette-body');
          await expect(paletteBody).not.toBeVisible();

          // Verify minimize button changed to "+"
          await expect(minimizeBtn).toHaveText('+');

          // Verify ball positions haven't changed (no table interaction occurred)
          const ballPositionsAfter = await page.evaluate(() => {
            const positions: any = {};
            document.querySelectorAll('.ball').forEach((ball: any) => {
              positions[ball.id] = {
                left: ball.style.left,
                top: ball.style.top
              };
            });
            return positions;
          });

          // Compare positions
          expect(ballPositionsAfter).toEqual(ballPositionsBefore);

          // Take screenshot after minimize
          await page.screenshot({ 
            path: `tests/ui-ux/screenshots/${palette.id}-after-minimize-${resolution.width}x${resolution.height}.png` 
          });

          // Test expanding (clicking + button)
          await minimizeBtn.click();
          await page.waitForTimeout(300);

          // Verify palette is expanded again
          await expect(paletteBody).toBeVisible();
          await expect(minimizeBtn).toHaveText('−');

          // Verify ball positions still haven't changed
          const ballPositionsFinal = await page.evaluate(() => {
            const positions: any = {};
            document.querySelectorAll('.ball').forEach((ball: any) => {
              positions[ball.id] = {
                left: ball.style.left,
                top: ball.style.top
              };
            });
            return positions;
          });

          expect(ballPositionsFinal).toEqual(ballPositionsBefore);
        });

        test(`${palette.name} palette minimize should not affect other palettes`, async ({ page }) => {
          const paletteElement = page.locator(`#${palette.id}`);
          const minimizeBtn = paletteElement.locator('.palette-btn.minimize');

          // Minimize the target palette
          await minimizeBtn.click();
          await page.waitForTimeout(200);

          // Check that other palettes are still in their original state
          for (const otherPalette of PALETTES) {
            if (otherPalette.id !== palette.id) {
              const otherElement = page.locator(`#${otherPalette.id}`);
              const otherBody = otherElement.locator('.palette-body');
              
              // Other palettes should still be visible (not minimized)
              await expect(otherBody).toBeVisible();
            }
          }
        });
      }

      test('Multiple palettes can be minimized simultaneously', async ({ page }) => {
        // Minimize all palettes
        for (const palette of PALETTES) {
          const paletteElement = page.locator(`#${palette.id}`);
          const minimizeBtn = paletteElement.locator('.palette-btn.minimize');
          await minimizeBtn.click();
          await page.waitForTimeout(100);
        }

        // Verify all are minimized
        for (const palette of PALETTES) {
          const paletteElement = page.locator(`#${palette.id}`);
          const paletteBody = paletteElement.locator('.palette-body');
          await expect(paletteBody).not.toBeVisible();
        }

        // Take screenshot of all minimized state
        await page.screenshot({ 
          path: `tests/ui-ux/screenshots/all-minimized-${resolution.width}x${resolution.height}.png` 
        });
      });

      test('Save palette minimize with selected ball should not move ball', async ({ page }) => {
        // Place and select a ball
        const cueBall = page.locator('#ball-cue');
        await cueBall.dragTo(page.locator('#pool-table-svg'), {
          targetPosition: { x: 400, y: 300 }
        });
        await page.waitForTimeout(300);

        // Double-click to select the cue ball
        await cueBall.dblclick();
        await page.waitForTimeout(200);

        // Get cue ball position
        const positionBefore = await cueBall.evaluate((el: any) => ({
          left: el.style.left,
          top: el.style.top
        }));

        // Click minimize on save palette
        const savePalette = page.locator('#palette-save');
        const minimizeBtn = savePalette.locator('.palette-btn.minimize');
        await minimizeBtn.click();
        await page.waitForTimeout(300);

        // Verify ball hasn't moved
        const positionAfter = await cueBall.evaluate((el: any) => ({
          left: el.style.left,
          top: el.style.top
        }));

        expect(positionAfter).toEqual(positionBefore);
      });
    });
  }
});

test.describe('Palette UI/UX Visual Regression', () => {
  test('Visual comparison of palette states across resolutions', async ({ page }) => {
    for (const resolution of RESOLUTIONS) {
      await page.setViewportSize({ 
        width: resolution.width, 
        height: resolution.height 
      });
      await page.goto('/');
      await page.waitForSelector('#pool-table-svg', { state: 'visible' });
      await page.waitForTimeout(500);

      // Take full page screenshot
      await page.screenshot({ 
        path: `tests/ui-ux/screenshots/full-page-${resolution.width}x${resolution.height}.png`,
        fullPage: true
      });

      // Screenshot each palette individually
      for (const palette of PALETTES) {
        const paletteElement = page.locator(`#${palette.id}`);
        await paletteElement.screenshot({
          path: `tests/ui-ux/screenshots/${palette.id}-normal-${resolution.width}x${resolution.height}.png`
        });

        // Minimize and screenshot
        const minimizeBtn = paletteElement.locator('.palette-btn.minimize');
        await minimizeBtn.click();
        await page.waitForTimeout(200);
        
        await paletteElement.screenshot({
          path: `tests/ui-ux/screenshots/${palette.id}-minimized-${resolution.width}x${resolution.height}.png`
        });

        // Restore
        await minimizeBtn.click();
        await page.waitForTimeout(200);
      }
    }
  });
});

test.describe('Palette Positioning at Different Resolutions', () => {
  for (const resolution of RESOLUTIONS) {
    test(`Palettes should be properly positioned at ${resolution.name}`, async ({ page }) => {
      await page.setViewportSize({ 
        width: resolution.width, 
        height: resolution.height 
      });
      await page.goto('/');
      await page.waitForSelector('#pool-table-svg', { state: 'visible' });
      await page.waitForTimeout(500);

      // Check that palettes don't overflow viewport
      for (const palette of PALETTES) {
        const paletteElement = page.locator(`#${palette.id}`);
        const box = await paletteElement.boundingBox();
        
        if (box) {
          // Palette should be within viewport bounds
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(resolution.width);
          expect(box.y + box.height).toBeLessThanOrEqual(resolution.height);
        }
      }
    });
  }
});
