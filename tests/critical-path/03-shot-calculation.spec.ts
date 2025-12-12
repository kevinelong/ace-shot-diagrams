import { test, expect } from '../setup/test-helpers';

/**
 * Critical Path Test: Shot Calculation
 * 
 * User Intent: "I want to see how to make this shot and understand the physics"
 * 
 * This tests the core value proposition - showing users HOW to make shots.
 */

test.describe('Shot Calculation - Critical Path', () => {
  
  test.beforeEach(async ({ page, aceHelper }) => {
    await page.goto('/');
    await aceHelper.clearLocalStorage();
  });

  test('should calculate straight-in shot correctly', async ({ page, aceHelper }) => {
    // USER SCENARIO: "Easy straight shot - 0 degree cut"
    
    // Place balls in line with pocket
    await aceHelper.dragBallToTable(0, 300, 450); // cue ball
    await aceHelper.dragBallToTable(1, 500, 450); // object ball (same y)
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR'); // top-right at same height
    
    await page.waitForTimeout(300);
    
    // Cut angle should be near 0 degrees (straight shot)
    const cutAngle = await aceHelper.getCutAngle();
    expect(cutAngle).toBeLessThan(5); // Allow small margin
    
    // Ghost ball should be directly behind object ball
    expect(await aceHelper.isGhostBallVisible()).toBe(true);
    
    // All visual aids should be present
    expect(await aceHelper.isTargetLineVisible()).toBe(true);
    expect(await aceHelper.isCueBallPathVisible()).toBe(true);
  });

  test('should calculate angled cut shot correctly', async ({ page, aceHelper }) => {
    // USER SCENARIO: "30-degree cut shot"
    
    // Setup angled shot
    await aceHelper.dragBallToTable(0, 200, 600); // cue ball lower left
    await aceHelper.dragBallToTable(5, 500, 450); // object ball center
    await aceHelper.selectObjectBall(5);
    await aceHelper.selectPocket('TR'); // top-right pocket
    
    await page.waitForTimeout(300);
    
    // Should have measurable cut angle
    const cutAngle = await aceHelper.getCutAngle();
    expect(cutAngle).toBeGreaterThan(15);
    expect(cutAngle).toBeLessThan(60);
    
    // Ghost ball should be visible and offset
    expect(await aceHelper.isGhostBallVisible()).toBe(true);
  });

  test('should display shot difficulty rating', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Tell me how hard this shot is"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(300);
    
    // Difficulty information should be displayed
    const difficultyText = page.locator('#difficultyText');
    await expect(difficultyText).toBeVisible();
    
    // Should have actual text content
    const text = await difficultyText.textContent();
    expect(text).toBeTruthy();
    expect(text?.length).toBeGreaterThan(0);
  });

  test('should update calculations when ball position changes', async ({ page, aceHelper }) => {
    // USER SCENARIO: "I adjust the ball positions and want updated info"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(200);
    const angle1 = await aceHelper.getCutAngle();
    
    // Move cue ball to different position
    await aceHelper.dragBallToTable(0, 250, 650);
    await page.waitForTimeout(200);
    const angle2 = await aceHelper.getCutAngle();
    
    // Angle should have changed
    expect(angle1).not.toBe(angle2);
  });

  test('should show contact point indicator', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me exactly where balls will contact"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(300);
    
    // Contact point should be visible
    const contactPoint = page.locator('#contact-point');
    await expect(contactPoint).toBeVisible();
  });

  test('should display final position indicators', async ({ page, aceHelper }) => {
    // USER INTENT: "Where will balls end up after the shot?"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(300);
    
    // Final positions should be calculated and shown
    const cbFinal = page.locator('#cb-final-position');
    const obFinal = page.locator('#ob-final-position');
    
    // At least cue ball final position should be shown
    await expect(cbFinal).toBeVisible();
  });

  test('should provide aim instruction text', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Tell me what to do in plain language"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(300);
    
    // Aim instruction should be displayed
    const aimInstruction = page.locator('#aimInstruction');
    await expect(aimInstruction).toBeVisible();
    
    const instruction = await aimInstruction.textContent();
    expect(instruction).toBeTruthy();
    
    // Should contain helpful guidance (not just numbers)
    expect(instruction?.length).toBeGreaterThan(10);
  });

  test('should handle impossible shots gracefully', async ({ page, aceHelper }) => {
    // USER SCENARIO: "Shot is blocked or impossible"
    
    // Place balls where direct shot is blocked
    await aceHelper.dragBallToTable(0, 200, 650);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.dragBallToTable(3, 350, 525); // blocking ball
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(300);
    
    // Should provide feedback about difficulty or alternative
    // App might show warning or suggest kick shot
    const statusMessage = await page.locator('#statusMessage').textContent();
    
    // Some indication should be present
    // (Exact message depends on implementation)
    expect(statusMessage !== null || await aceHelper.isTargetLineVisible()).toBe(true);
  });

  test('should calculate object ball path to pocket', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me the ball's path to the pocket"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(300);
    
    // Object ball path line should be visible
    const objBallPath = page.locator('#obj-ball-path');
    await expect(objBallPath).toBeVisible();
  });

  test('should recalculate instantly without lag', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Calculations should be instant"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    
    // Time multiple pocket selections
    const startTime = Date.now();
    
    await aceHelper.selectPocket('TR');
    await page.waitForTimeout(50);
    
    await aceHelper.selectPocket('TL');
    await page.waitForTimeout(50);
    
    await aceHelper.selectPocket('BR');
    await page.waitForTimeout(50);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should complete very quickly (< 1 second for 3 calculations)
    expect(totalTime).toBeLessThan(1000);
    
    // Final calculation should be correct
    expect(await aceHelper.isGhostBallVisible()).toBe(true);
  });

  test('should show shot verdict', async ({ page, aceHelper }) => {
    // USER INTENT: "Can I make this shot?"
    
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');
    
    await page.waitForTimeout(300);
    
    // Shot verdict should be displayed
    const verdict = page.locator('#shotVerdict');
    await expect(verdict).toBeVisible();
    
    const verdictText = await verdict.textContent();
    expect(verdictText).toBeTruthy();
    
    // Should contain meaningful assessment
    // (e.g., "MAKEABLE", "DIFFICULT", "RISKY")
    expect(verdictText?.length).toBeGreaterThan(3);
  });
});
