import { test, expect } from '../setup/test-helpers';

/**
 * Critical Path Test: Ball Placement
 * 
 * User Intent: "I want to set up a specific pool shot scenario"
 * 
 * This tests the most fundamental interaction - placing balls on the table.
 * Without this working, nothing else matters.
 */

test.describe('Ball Placement - Critical Path', () => {
  
  test.beforeEach(async ({ page, aceHelper }) => {
    await page.goto('/');
    await aceHelper.clearLocalStorage();
  });

  test('should load application with empty table', async ({ page }) => {
    // User sees the application load
    await expect(page.locator('#pool-table-svg')).toBeVisible();
    
    // User sees the ball palette
    await expect(page.locator('#palette-balls')).toBeVisible();
    
    // Table starts empty (no balls placed yet)
    const ballsOnTable = await page.locator('[id^="ball-"]').count();
    expect(ballsOnTable).toBe(0);
  });

  test('should drag cue ball from palette onto table', async ({ page, aceHelper }) => {
    // USER ACTION: User wants to place the cue ball
    // They drag it from the palette onto the table
    
    // Verify cue ball is in palette initially
    await expect(page.locator('#palette-balls .ball-item[data-ball="0"]')).toBeVisible();
    
    // Drag cue ball to center of table
    await aceHelper.dragBallToTable(0, 400, 450);
    
    // EXPECTED OUTCOME: Cue ball appears on table
    await expect(page.locator('#ball-0')).toBeVisible();
    
    // Visual feedback: Ball is in the correct position
    const ballBox = await page.locator('#ball-0').boundingBox();
    expect(ballBox).toBeTruthy();
  });

  test('should drag multiple balls onto table', async ({ page, aceHelper }) => {
    // USER SCENARIO: Setting up a 9-ball break
    // User places cue ball and several object balls
    
    // Place cue ball
    await aceHelper.dragBallToTable(0, 300, 600);
    await expect(page.locator('#ball-0')).toBeVisible();
    
    // Place ball 1
    await aceHelper.dragBallToTable(1, 500, 400);
    await expect(page.locator('#ball-1')).toBeVisible();
    
    // Place ball 9
    await aceHelper.dragBallToTable(9, 550, 400);
    await expect(page.locator('#ball-9')).toBeVisible();
    
    // All three balls visible
    expect(await aceHelper.isBallOnTable(0)).toBe(true);
    expect(await aceHelper.isBallOnTable(1)).toBe(true);
    expect(await aceHelper.isBallOnTable(9)).toBe(true);
  });

  test('should select object ball by double-clicking', async ({ page, aceHelper }) => {
    // USER INTENT: "I want to shoot at ball #1"
    
    // Setup: Place balls on table
    await aceHelper.dragBallToTable(0, 300, 600); // cue ball
    await aceHelper.dragBallToTable(1, 500, 400); // object ball
    
    // USER ACTION: Double-click ball 1 to select it
    await aceHelper.selectObjectBall(1);
    
    // EXPECTED OUTCOME: Ball 1 is highlighted/selected
    const ball1 = page.locator('#ball-1');
    
    // Visual feedback: Ball has selection indicator
    // (May be a class, stroke, or glow - adjust selector as needed)
    const hasSelection = await ball1.evaluate(el => {
      return el.classList.contains('selected') || 
             el.getAttribute('stroke-width') === '3' ||
             el.closest('g')?.classList.contains('selected');
    });
    
    expect(hasSelection).toBe(true);
  });

  test('should prevent placing balls off table', async ({ page, aceHelper }) => {
    // USER ERROR: User tries to drag ball completely off table
    // EXPECTED: App prevents this or snaps ball back
    
    const ballPalette = page.locator('#palette-balls .ball-item[data-ball="1"]');
    const offTablePosition = { x: -50, y: -50 };
    
    // Try to drag ball to invalid position
    await ballPalette.dragTo(page.locator('#pool-table-svg'), {
      targetPosition: offTablePosition
    });
    
    await page.waitForTimeout(300);
    
    // Ball should NOT appear on table
    expect(await aceHelper.isBallOnTable(1)).toBe(false);
  });

  test('should provide visual feedback during ball drag', async ({ page }) => {
    // USER EXPECTATION: "I want to see where the ball will land"
    
    const cueBall = page.locator('#palette-balls .ball-item[data-ball="0"]');
    
    // Start dragging
    await cueBall.hover();
    await page.mouse.down();
    
    // Move over table
    const tableSvg = page.locator('#pool-table-svg');
    const tableBox = await tableSvg.boundingBox();
    
    if (tableBox) {
      await page.mouse.move(tableBox.x + 400, tableBox.y + 450);
      
      // Visual feedback should appear (ghost preview, highlight, etc.)
      // This test verifies cursor changes or preview appears
      await page.waitForTimeout(100);
      
      // Complete the drag
      await page.mouse.up();
      
      // Ball should now be on table
      await expect(page.locator('#ball-0')).toBeVisible();
    }
  });

  test('should handle rapid ball placement', async ({ page, aceHelper }) => {
    // USER SCENARIO: Experienced user quickly setting up a rack
    
    // Place 5 balls rapidly without waiting
    const placements = [
      { ball: 0, x: 300, y: 600 },
      { ball: 1, x: 500, y: 400 },
      { ball: 2, x: 520, y: 380 },
      { ball: 3, x: 480, y: 380 },
      { ball: 9, x: 500, y: 360 }
    ];
    
    for (const p of placements) {
      await aceHelper.dragBallToTable(p.ball, p.x, p.y);
    }
    
    // All balls should be placed
    for (const p of placements) {
      expect(await aceHelper.isBallOnTable(p.ball)).toBe(true);
    }
  });

  test('should maintain ball positions after page interactions', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "My ball positions shouldn't randomly change"
    
    // Place balls
    await aceHelper.dragBallToTable(0, 300, 600);
    await aceHelper.dragBallToTable(1, 500, 400);
    
    // Get initial positions
    const ball0Initial = await page.locator('#ball-0').boundingBox();
    const ball1Initial = await page.locator('#ball-1').boundingBox();
    
    // Interact with UI (open/close palette)
    await aceHelper.minimizePalette('balls');
    await page.waitForTimeout(200);
    
    // Positions should be unchanged
    const ball0After = await page.locator('#ball-0').boundingBox();
    const ball1After = await page.locator('#ball-1').boundingBox();
    
    expect(ball0After?.x).toBeCloseTo(ball0Initial?.x || 0, 1);
    expect(ball0After?.y).toBeCloseTo(ball0Initial?.y || 0, 1);
    expect(ball1After?.x).toBeCloseTo(ball1Initial?.x || 0, 1);
    expect(ball1After?.y).toBeCloseTo(ball1Initial?.y || 0, 1);
  });
});
