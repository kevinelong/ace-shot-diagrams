import { test, expect } from '../setup/test-helpers';

/**
 * Feature Test: Power Control
 *
 * User Intent: "I want to control how hard I hit the ball"
 *
 * The app uses a 1-10 power scale shown in the Cue Control palette
 * (#forceSlider-palette / #forceValue-palette).
 */

test.describe('Power Control', () => {

  test.beforeEach(async ({ page, aceHelper }) => {
    await page.goto('/');
    await aceHelper.clearLocalStorage();

    // Setup a shot (on-table coords are in SVG units: ~0-100 x, 0-50 y)
    await aceHelper.dragBallToTable(0, 30, 25);
    await aceHelper.dragBallToTable(1, 65, 30);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('BR');
  });

  test('should display power slider', async ({ page }) => {
    const powerSlider = page.locator('#forceSlider-palette');
    await expect(powerSlider).toBeVisible();
  });

  test('should display current power value', async ({ page }) => {
    const powerValue = page.locator('#forceValue-palette');
    await expect(powerValue).toBeVisible();
    expect(await powerValue.textContent()).toBeTruthy();
  });

  test('should set a soft power (3/10)', async ({ page, aceHelper }) => {
    await aceHelper.setPower(3);
    await page.waitForTimeout(200);
    expect(await page.locator('#forceValue-palette').textContent()).toContain('3');
  });

  test('should set maximum power (10/10)', async ({ page, aceHelper }) => {
    await aceHelper.setPower(10);
    await page.waitForTimeout(200);
    expect(await page.locator('#forceValue-palette').textContent()).toContain('10');
  });

  test('should update the displayed value across the range', async ({ page, aceHelper }) => {
    for (const value of [2, 4, 6, 8, 10]) {
      await aceHelper.setPower(value);
      await page.waitForTimeout(100);
      const displayed = await page.locator('#forceValue-palette').textContent();
      expect(parseInt(displayed || '0')).toBe(value);
    }
  });
});
