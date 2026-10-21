import { test, expect } from '@playwright/test';

/**
 * Standalone mode: the Playwright static server has no /ace/api backend.
 * The core editor must work, and backend-only account/cloud/share UI must be
 * hidden instead of presenting dead sign-in controls.
 */

test.use({ screenshot: 'on' });

test.describe('Standalone / backend unavailable', () => {
  test('core works and backend-only UI is hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    await expect(page.locator('#palette-save')).toBeHidden();
    await expect(page.locator('#aceGuest')).toBeHidden();
    await expect(page.locator('#aceCloud')).toBeHidden();
    await expect(page.locator('#aceSharedBanner')).toBeHidden();

    // The core aim calculation is backend-independent.
    await page.evaluate(() => {
      // @ts-ignore - app debug API
      window.DEBUG.placeBall('1', 60, 25);
      // @ts-ignore
      window.DEBUG.selectBall('1');
      // @ts-ignore
      window.DEBUG.selectPocket('corner-tr');
    });
    await expect(page.locator('#ghost-ball-indicator')).toHaveAttribute('visibility', 'visible');

    // Local save still works.
    await page.locator('#palette-game .palette-btn.minimize').click();
    await page.locator('#saveDiagramName').fill('standalone-save');
    await page.locator('#btnSaveDiagram').click();
    await expect(page.locator('#savedDiagramsList')).toContainText('standalone-save');

    // Hash share links still work.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#btnCopyLink').click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('#v1|');
  });
});
