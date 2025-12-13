import { test, expect } from '@playwright/test';

/**
 * Quick validation test for palette minimize fix
 * Tests the specific issue: clicking minimize on save palette shouldn't interact with table
 */

test.describe('Palette Minimize Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#pool-table-svg', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('Save palette minimize button should work without table interaction', async ({ page }) => {
    // Place cue ball on table
    const cueBall = page.locator('#ball-cue');
    const table = page.locator('#pool-table-svg');
    
    // Drag cue ball to table
    await cueBall.dragTo(table, {
      sourcePosition: { x: 20, y: 20 },
      targetPosition: { x: 400, y: 300 }
    });
    await page.waitForTimeout(300);

    // Get cue ball position before minimize click
    const positionBefore = await page.evaluate(() => {
      const ball = document.getElementById('ball-cue');
      return ball ? {
        left: ball.style.left,
        top: ball.style.top
      } : null;
    });

    console.log('Position before minimize:', positionBefore);

    // Find save palette and its minimize button
    const savePalette = page.locator('#palette-save');
    await expect(savePalette).toBeVisible();
    
    const minimizeBtn = savePalette.locator('.palette-btn.minimize');
    await expect(minimizeBtn).toBeVisible();
    await expect(minimizeBtn).toHaveText('−');

    // Click the minimize button
    await minimizeBtn.click();
    await page.waitForTimeout(300);

    // Verify palette is minimized
    const paletteBody = savePalette.locator('.palette-body');
    await expect(paletteBody).not.toBeVisible();
    await expect(minimizeBtn).toHaveText('+');

    // Get cue ball position after minimize click
    const positionAfter = await page.evaluate(() => {
      const ball = document.getElementById('ball-cue');
      return ball ? {
        left: ball.style.left,
        top: ball.style.top
      } : null;
    });

    console.log('Position after minimize:', positionAfter);

    // Assert ball hasn't moved
    expect(positionAfter).toEqual(positionBefore);

    // Test expanding back
    await minimizeBtn.click();
    await page.waitForTimeout(300);
    
    await expect(paletteBody).toBeVisible();
    await expect(minimizeBtn).toHaveText('−');

    // Final position check
    const positionFinal = await page.evaluate(() => {
      const ball = document.getElementById('ball-cue');
      return ball ? {
        left: ball.style.left,
        top: ball.style.top
      } : null;
    });

    console.log('Position after expand:', positionFinal);
    expect(positionFinal).toEqual(positionBefore);
  });

  test('Actions palette minimize button should work', async ({ page }) => {
    const actionsPalette = page.locator('#palette-actions');
    await expect(actionsPalette).toBeVisible();
    
    const minimizeBtn = actionsPalette.locator('.palette-btn.minimize');
    await minimizeBtn.click();
    await page.waitForTimeout(200);

    const paletteBody = actionsPalette.locator('.palette-body');
    await expect(paletteBody).not.toBeVisible();
  });

  test('Aids palette minimize button should work', async ({ page }) => {
    const aidsPalette = page.locator('#palette-aids');
    await expect(aidsPalette).toBeVisible();
    
    const minimizeBtn = aidsPalette.locator('.palette-btn.minimize');
    await minimizeBtn.click();
    await page.waitForTimeout(200);

    const paletteBody = aidsPalette.locator('.palette-body');
    await expect(paletteBody).not.toBeVisible();
  });

  test('All palettes minimize buttons registered correctly', async ({ page }) => {
    const paletteIds = [
      'palette-balls', 'palette-cue', 'palette-legend', 
      'palette-game', 'palette-shot', 'palette-actions', 
      'palette-save', 'palette-aids'
    ];

    for (const paletteId of paletteIds) {
      const palette = page.locator(`#${paletteId}`);
      await expect(palette).toBeVisible();
      
      const minimizeBtn = palette.locator('.palette-btn.minimize');
      await expect(minimizeBtn).toBeVisible();
      
      // Verify it's clickable and functional
      await minimizeBtn.click();
      await page.waitForTimeout(100);
      
      const body = palette.locator('.palette-body');
      await expect(body).not.toBeVisible();
      
      // Restore for next test
      await minimizeBtn.click();
      await page.waitForTimeout(100);
    }
  });
});
