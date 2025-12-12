import { test, expect } from '../setup/test-helpers';

/**
 * Feature Test: English (Spin) Controls
 * 
 * User Intent: "I want to control cue ball spin for position play"
 * 
 * Tests the spin selector and its effect on shot calculations.
 */

test.describe('English Controls', () => {
  
  test.beforeEach(async ({ page, aceHelper }) => {
    await page.goto('/');
    await aceHelper.clearLocalStorage();
    
    // Setup basic shot
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
  });

  test('should display english selector diagram', async ({ page }) => {
    // USER EXPECTATION: "I can see where to apply spin"
    
    const englishSelector = page.locator('#english-selector');
    await expect(englishSelector).toBeVisible();
    
    // Should have clickable points (3x3 grid typically)
    const englishPoints = await page.locator('.english-point').count();
    expect(englishPoints).toBeGreaterThan(5); // At least several points
  });

  test('should select center ball (no spin)', async ({ page, aceHelper }) => {
    // USER ACTION: "Hit center ball for neutral spin"
    
    await aceHelper.setEnglish(0, 0); // Center
    await page.waitForTimeout(200);
    
    // Spin type should indicate center/neutral
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toContain('center');
  });

  test('should select top spin (follow)', async ({ page, aceHelper }) => {
    // USER ACTION: "I want follow to go forward after contact"
    
    await aceHelper.setEnglish(0, 1); // Top
    await page.waitForTimeout(200);
    
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toMatch(/top|follow/);
  });

  test('should select bottom spin (draw)', async ({ page, aceHelper }) => {
    // USER ACTION: "I want draw to pull back the cue ball"
    
    await aceHelper.setEnglish(0, -1); // Bottom
    await page.waitForTimeout(200);
    
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toMatch(/bottom|draw|backspin/);
  });

  test('should select right english', async ({ page, aceHelper }) => {
    // USER ACTION: "Apply right spin"
    
    await aceHelper.setEnglish(1, 0); // Right
    await page.waitForTimeout(200);
    
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toContain('right');
  });

  test('should select left english', async ({ page, aceHelper }) => {
    // USER ACTION: "Apply left spin"
    
    await aceHelper.setEnglish(-1, 0); // Left
    await page.waitForTimeout(200);
    
    const spinType = await page.locator('#spinType').textContent();
    expect(spinType?.toLowerCase()).toContain('left');
  });

  test('should provide visual feedback on selection', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "I can see which spin I selected"
    
    await aceHelper.setEnglish(1, 1); // Top-right
    await page.waitForTimeout(200);
    
    // Some visual indicator should show selected position
    const selectedPoint = page.locator('.english-point.selected');
    await expect(selectedPoint).toBeVisible();
  });

  test('should affect cue ball final position', async ({ page, aceHelper }) => {
    // USER INTENT: "Different spin should change where cue ball ends up"
    
    // Get position with center ball
    await aceHelper.setEnglish(0, 0);
    await page.waitForTimeout(200);
    const centerPos = await page.locator('#cb-final-position').boundingBox();
    
    // Change to top spin
    await aceHelper.setEnglish(0, 1);
    await page.waitForTimeout(200);
    const followPos = await page.locator('#cb-final-position').boundingBox();
    
    // Positions should be different
    // (Follow should make CB travel further)
    if (centerPos && followPos) {
      const distance = Math.abs(centerPos.y - followPos.y);
      expect(distance).toBeGreaterThan(5); // Some measurable difference
    }
  });

  test('should display english instruction in shot info', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Tell me what this spin does"
    
    await aceHelper.setEnglish(1, 0); // Right english
    await page.waitForTimeout(200);
    
    const englishInstruction = page.locator('#englishInstruction');
    await expect(englishInstruction).toBeVisible();
    
    const instruction = await englishInstruction.textContent();
    expect(instruction).toBeTruthy();
  });
});
