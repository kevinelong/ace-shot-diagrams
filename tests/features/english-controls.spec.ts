import { test, expect } from '../setup/test-helpers';

/**
 * Feature Test: English (Spin) Controls
 *
 * User Intent: "I want to control cue ball spin for position play"
 *
 * The app uses a draggable cue-contact diagram (#contact-diagram / #contact-point);
 * the current spin type is reflected in #spinType (updated by updateSpinDisplay).
 */

test.describe('English Controls', () => {

  test.beforeEach(async ({ page, aceHelper }) => {
    await page.goto('/');
    await aceHelper.clearLocalStorage();

    await aceHelper.dragBallToTable(0, 30, 25);
    await aceHelper.dragBallToTable(1, 65, 30);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('BR');
  });

  test('should display the cue contact (spin) diagram', async ({ page }) => {
    await expect(page.locator('#contact-diagram')).toBeVisible();
  });

  test('should select center ball (no spin)', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(0, 0);
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toContain('center');
  });

  test('should select top spin (follow)', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(0, 1);
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toMatch(/top|follow/);
  });

  test('should select bottom spin (draw)', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(0, -1);
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toMatch(/bottom|draw|backspin/);
  });

  test('should select right english', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(1, 0);
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toContain('right');
  });

  test('should select left english', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(-1, 0);
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toContain('left');
  });

  test('should move the contact point to reflect the selection', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(1, 0); // right
    const cx = parseFloat(await page.locator('#contact-point').getAttribute('cx') || '0');
    expect(cx).toBeGreaterThan(0);
  });
});
