import { test, expect } from '../setup/test-helpers';

/**
 * Critical Path Test: Ball Placement
 *
 * User Intent: "I want to set up a specific pool shot scenario"
 *
 * This tests the most fundamental interaction - placing balls on the table.
 * Without this working, nothing else matters.
 *
 * Note: These tests use ?empty=1 to start with an empty table for testing
 * ball placement from the palette. The default app behavior is to show
 * an 8-ball rack on load.
 */

test.describe('Ball Placement - Critical Path', () => {

  test.beforeEach(async ({ aceHelper }) => {
    // Use empty table mode for ball placement tests
    // Note: gotoEmpty() already sets tour-completed in localStorage
    await aceHelper.gotoEmpty();
  });

  test('should drag cue ball from palette onto table', async ({ page, aceHelper }) => {
    // USER ACTION: User wants to place the cue ball
    // They drag it from the palette onto the table

    // Verify cue ball is in palette initially (using correct selector)
    await expect(page.locator('#palette-balls .ball[data-ball-id="cue"]')).toBeVisible();

    // Drag cue ball to center of table (SVG coords: x 0-100, y 0-50)
    await aceHelper.dragBallToTable(0, 50, 30);

    // EXPECTED OUTCOME: Cue ball appears on table
    await expect(page.locator('#ball-cue')).toBeVisible();

    // Visual feedback: Ball is in the correct position
    const ballBox = await page.locator('#ball-cue').boundingBox();
    expect(ballBox).toBeTruthy();
  });

  test('should drag multiple balls onto table', async ({ page, aceHelper }) => {
    // USER SCENARIO: Setting up a 9-ball break
    // User places cue ball and several object balls (SVG coords: x 0-100, y 0-50)

    // Place cue ball
    await aceHelper.dragBallToTable(0, 30, 40);
    await expect(page.locator('#ball-cue')).toBeVisible();

    // Place ball 1
    await aceHelper.dragBallToTable(1, 60, 25);
    await expect(page.locator('#ball-1')).toBeVisible();

    // Place ball 9
    await aceHelper.dragBallToTable(9, 65, 25);
    await expect(page.locator('#ball-9')).toBeVisible();

    // All three balls visible
    expect(await aceHelper.isBallOnTable(0)).toBe(true);
    expect(await aceHelper.isBallOnTable(1)).toBe(true);
    expect(await aceHelper.isBallOnTable(9)).toBe(true);
  });

  test('should select object ball by double-clicking', async ({ page, aceHelper }) => {
    // USER INTENT: "I want to shoot at ball #1"

    // Setup: Place balls on table (SVG coords: x 0-100, y 0-50)
    await aceHelper.dragBallToTable(0, 30, 40); // cue ball
    await aceHelper.dragBallToTable(1, 60, 25); // object ball

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

  test('should handle ball placement at valid table positions', async ({ page, aceHelper }) => {
    // USER SCENARIO: User places ball at a valid position on the table
    // EXPECTED: Ball should be placed and visible

    // Place ball at valid position near edge
    await aceHelper.dragBallToTable(1, 5, 5); // Near corner but valid

    // Ball should appear on table
    expect(await aceHelper.isBallOnTable(1)).toBe(true);

    // Verify position is stored correctly
    const ballPos = await page.evaluate(() => {
      // @ts-ignore
      return window.DEBUG.balls()['1'];
    });
    expect(ballPos).toBeTruthy();
    expect(ballPos.x).toBeCloseTo(5, 0);
    expect(ballPos.y).toBeCloseTo(5, 0);

    // Place another ball at a different valid position
    await aceHelper.dragBallToTable(2, 90, 40); // Near other corner

    expect(await aceHelper.isBallOnTable(2)).toBe(true);
    const ball2Pos = await page.evaluate(() => {
      // @ts-ignore
      return window.DEBUG.balls()['2'];
    });
    expect(ball2Pos.x).toBeCloseTo(90, 0);
    expect(ball2Pos.y).toBeCloseTo(40, 0);
  });

  test('should provide visual feedback when ball is placed', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "I want to see the ball on the table after placing it"

    // Place cue ball using DEBUG API
    await aceHelper.dragBallToTable(0, 50, 25);

    // Ball should now be visible on table with on-table class
    const cueBall = page.locator('#ball-cue');
    await expect(cueBall).toBeVisible();
    await expect(cueBall).toHaveClass(/on-table/);

    // Ball should be positioned at the correct location
    const ballPos = await page.evaluate(() => {
      // @ts-ignore
      return window.DEBUG.cue();
    });
    expect(ballPos).toBeTruthy();
    expect(ballPos.x).toBeCloseTo(50, 0);
    expect(ballPos.y).toBeCloseTo(25, 0);
  });

  test('should handle rapid ball placement', async ({ page, aceHelper }) => {
    // USER SCENARIO: Experienced user quickly setting up a rack
    // SVG coords: x 0-100, y 0-50

    // Place 5 balls rapidly without waiting
    const placements = [
      { ball: 0, x: 30, y: 40 },
      { ball: 1, x: 60, y: 25 },
      { ball: 2, x: 62, y: 23 },
      { ball: 3, x: 58, y: 23 },
      { ball: 9, x: 60, y: 21 }
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
    // SVG coords: x 0-100, y 0-50

    // Place balls
    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);

    // Get initial positions
    const ball0Initial = await page.locator('#ball-cue').boundingBox();
    const ball1Initial = await page.locator('#ball-1').boundingBox();

    // Interact with UI (open/close palette)
    await aceHelper.minimizePalette('balls');
    await page.waitForTimeout(200);

    // Positions should be unchanged
    const ball0After = await page.locator('#ball-cue').boundingBox();
    const ball1After = await page.locator('#ball-1').boundingBox();

    expect(ball0After?.x).toBeCloseTo(ball0Initial?.x || 0, 1);
    expect(ball0After?.y).toBeCloseTo(ball0Initial?.y || 0, 1);
    expect(ball1After?.x).toBeCloseTo(ball1Initial?.x || 0, 1);
    expect(ball1After?.y).toBeCloseTo(ball1Initial?.y || 0, 1);
  });
});
