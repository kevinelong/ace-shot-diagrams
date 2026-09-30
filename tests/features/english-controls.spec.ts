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
    // Without this the app's break preset (follow, power 7) lands after these actions and
    // overwrites the spin the test is about
    await aceHelper.waitForAppReady();

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
    // Poll: the label is the app's own statement of the spin it applied
    await expect(page.locator('#spinType')).toContainText(/center/i);
  });

  test('should select top spin (follow)', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(0, 1);
    // Poll: the label is the app's own statement of the spin it applied
    await expect(page.locator('#spinType')).toContainText(/top|follow/i);
  });

  test('should select bottom spin (draw)', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(0, -1);
    // Poll: the label is the app's own statement of the spin it applied
    await expect(page.locator('#spinType')).toContainText(/bottom|draw|backspin/i);
  });

  test('should select right english', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(1, 0);
    // Poll: the label is the app's own statement of the spin it applied
    await expect(page.locator('#spinType')).toContainText(/right/i);
  });

  test('should select left english', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(-1, 0);
    // Poll: the label is the app's own statement of the spin it applied
    await expect(page.locator('#spinType')).toContainText(/left/i);
  });

  test('should move the contact point to reflect the selection', async ({ page, aceHelper }) => {
    await aceHelper.setEnglish(1, 0); // right
    await expect.poll(async () =>
      parseFloat((await page.locator('#contact-point').getAttribute('cx')) || '0'),
      { message: 'right english should move the contact point off centre' }).toBeGreaterThan(0);
  });
});
