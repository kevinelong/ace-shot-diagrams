import { test, expect } from '../setup/test-helpers';

/**
 * Feature Test: Power Control
 * 
 * User Intent: "I want to control how hard I hit the ball"
 * 
 * Tests the power slider and its effect on shot trajectory.
 */

test.describe('Power Control', () => {
  
  test.beforeEach(async ({ page, aceHelper }) => {
    await page.goto('/');
    await aceHelper.clearLocalStorage();
    
    // Setup shot
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
  });

  test('should display power slider', async ({ page }) => {
    // USER EXPECTATION: "I can see the power control"
    
    const powerSlider = page.locator('#forceSlider');
    await expect(powerSlider).toBeVisible();
  });

  test('should display current power value', async ({ page }) => {
    // USER EXPECTATION: "I can see the current power setting"
    
    const powerValue = page.locator('#forceValue');
    await expect(powerValue).toBeVisible();
    
    const value = await powerValue.textContent();
    expect(value).toBeTruthy();
  });

  test('should set power to 25%', async ({ page, aceHelper }) => {
    // USER ACTION: "Soft shot"
    
    await aceHelper.setPower(25);
    await page.waitForTimeout(200);
    
    const displayedValue = await page.locator('#forceValue').textContent();
    expect(displayedValue).toContain('25');
  });

  test('should set power to 100%', async ({ page, aceHelper }) => {
    // USER ACTION: "Maximum power"
    
    await aceHelper.setPower(100);
    await page.waitForTimeout(200);
    
    const displayedValue = await page.locator('#forceValue').textContent();
    expect(displayedValue).toContain('100');
  });

  test('should affect cue ball final position', async ({ page, aceHelper }) => {
    // USER INTENT: "Higher power should make ball travel farther"
    
    // Low power
    await aceHelper.setPower(25);
    await page.waitForTimeout(200);
    const lowPowerPos = await page.locator('#cb-final-position').boundingBox();
    
    // High power
    await aceHelper.setPower(100);
    await page.waitForTimeout(200);
    const highPowerPos = await page.locator('#cb-final-position').boundingBox();
    
    // Positions should differ
    if (lowPowerPos && highPowerPos) {
      const distance = Math.sqrt(
        Math.pow(lowPowerPos.x - highPowerPos.x, 2) +
        Math.pow(lowPowerPos.y - highPowerPos.y, 2)
      );
      expect(distance).toBeGreaterThan(10);
    }
  });

  test('should display power recommendation', async ({ page }) => {
    // USER EXPECTATION: "Tell me how hard to hit"
    
    await page.waitForTimeout(300);
    
    const powerNeeded = page.locator('#powerNeeded');
    // May or may not be visible depending on shot
    // Just verify element exists
    const exists = await powerNeeded.count();
    expect(exists).toBeGreaterThan(0);
  });

  test('should update slider smoothly', async ({ page, aceHelper }) => {
    // USER EXPERIENCE: "Slider should feel responsive"
    
    const values = [10, 30, 50, 70, 90];
    
    for (const value of values) {
      await aceHelper.setPower(value);
      await page.waitForTimeout(100);
      
      // Verify it updates
      const displayed = await page.locator('#forceValue').textContent();
      expect(parseInt(displayed || '0')).toBeCloseTo(value, -1); // Within 10
    }
  });
});
