import { test, expect } from '../setup/test-helpers';

/**
 * Critical Path Test: Shot Calculation
 *
 * User Intent: "I want to see how to make this shot and understand the physics"
 *
 * This tests the core value proposition - showing users HOW to make shots.
 *
 * Note: These tests use ?empty=1 to start with an empty table,
 * then place balls at specific positions for predictable geometry calculations.
 *
 * Coordinates are in SVG units: X 0-100, Y 0-50 (playing surface ~2-98, 2-48)
 */

test.describe('Shot Calculation - Critical Path', () => {

  test.beforeEach(async ({ aceHelper }) => {
    // Use empty table mode for predictable ball positioning
    // Note: gotoEmpty() already sets tour-completed in localStorage
    await aceHelper.gotoEmpty();
  });

  test('should calculate straight-in shot correctly', async ({ page, aceHelper }) => {
    // USER SCENARIO: "Easy straight shot - low cut angle"

    // Place balls in line with side pocket (MR = side-bottom at x~50, y~48.5)
    // This creates a straight vertical line for a near-zero cut angle
    await aceHelper.dragBallToTable(0, 50, 20); // cue ball - same X as pocket
    await aceHelper.dragBallToTable(1, 50, 35); // object ball - same X, on line to pocket
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('MR'); // side-bottom pocket (directly below)

    // Cut angle should be very low (straight shot) - poll: the app calculates it on selection
    await expect.poll(() => aceHelper.getCutAngle()).toBeLessThan(10);

    // Ghost ball should be directly behind object ball
    expect(await aceHelper.isGhostBallVisible()).toBe(true);

    // All visual aids should be present
    expect(await aceHelper.isTargetLineVisible()).toBe(true);
    expect(await aceHelper.isCueBallPathVisible()).toBe(true);
  });

  test('should calculate angled cut shot correctly', async ({ page, aceHelper }) => {
    // USER SCENARIO: "Angled cut shot"

    // Setup angled shot
    await aceHelper.dragBallToTable(0, 20, 40); // cue ball lower left
    await aceHelper.dragBallToTable(5, 60, 28); // object ball center
    await aceHelper.selectObjectBall(5);
    await aceHelper.selectPocket('TR'); // top-right pocket

    // Should have measurable cut angle (poll the lower bound, then read the settled value)
    await expect.poll(() => aceHelper.getCutAngle()).toBeGreaterThan(15);
    expect(await aceHelper.getCutAngle()).toBeLessThan(60);

    // Ghost ball should be visible and offset
    expect(await aceHelper.isGhostBallVisible()).toBe(true);
  });

  test('should display shot difficulty rating', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Tell me how hard this shot is"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    // Difficulty information should be displayed in shot palette
    // Use specific locator since ID is duplicated in HTML
    const difficultyText = page.locator('#palette-shot #difficultyText-palette');
    await expect(difficultyText).toBeVisible();

    // Should have actual text content (not default "--")
    const text = await difficultyText.textContent();
    expect(text).toBeTruthy();
    expect(text).not.toBe('--');
  });

  test('should update calculations when ball position changes', async ({ page, aceHelper }) => {
    // USER SCENARIO: "I adjust the ball positions and want updated info"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    const angle1 = await aceHelper.getCutAngle();

    // Move cue ball to different position: poll until the recalculation lands, which is the
    // change under test (a fixed sleep could return before it and pass or fail at random)
    await aceHelper.dragBallToTable(0, 25, 42);
    await expect.poll(() => aceHelper.getCutAngle()).not.toBe(angle1);
  });

  test('should calculate and display shot info in palette', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me shot information when I set up a shot"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    // Shot info palette should show relevant data
    await expect.poll(() => aceHelper.getCutAngle()).toBeGreaterThan(0);

    // Make probability should be displayed (use specific parent since ID is duplicated)
    const makeProb = page.locator('#palette-shot #makeProbabilityDisplay');
    await expect(makeProb).toBeVisible();
    const makeProbText = await makeProb.textContent();
    expect(makeProbText).not.toBe('--');
  });

  test('should display final position indicators', async ({ page, aceHelper }) => {
    // USER INTENT: "Where will balls end up after the shot?"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    // Final positions should be calculated and shown
    const cbFinal = page.locator('#cb-final-position');
    const obFinal = page.locator('#ob-final-position');

    // At least cue ball final position should be shown
    await expect(cbFinal).toBeVisible();
  });

  test('should provide shot setup instructions', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me instructions for the shot"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    // Mini instructions in palette should update from default (use specific parent since ID is duplicated)
    const miniInstructions = page.locator('#palette-shot #shotMiniInstructions');
    await expect(miniInstructions).toBeVisible();
    // The update is the point: poll until it leaves the default text, then inspect it
    await expect(miniInstructions).not.toHaveText(/place balls/i, { timeout: 10000 });
    expect(await miniInstructions.textContent()).toBeTruthy();
  });

  test('should handle impossible shots gracefully', async ({ page, aceHelper }) => {
    // USER SCENARIO: "Shot is blocked or impossible"

    // Place balls where direct shot is blocked
    await aceHelper.dragBallToTable(0, 20, 42);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.dragBallToTable(3, 40, 33); // blocking ball
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    // Should provide feedback about difficulty or alternative
    // App might show warning or suggest kick shot.
    // Some indication should be present (exact message depends on implementation). The old
    // assertion here was vacuous: textContent() returns '' rather than null, so it always passed.
    await expect.poll(async () => {
        const msg = ((await page.locator('#statusMessage').textContent()) ?? '').trim();
        return msg !== '' || await aceHelper.isTargetLineVisible();
    }, { message: 'an impossible shot must still give some indication' }).toBe(true);
  });

  test('should calculate object ball path to pocket', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me the ball's path to the pocket"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    // Object ball path line should be visible
    const objBallPath = page.locator('#obj-ball-path');
    await expect(objBallPath).toBeVisible();
  });

  test('should recalculate instantly without lag', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Calculations should be instant"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
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

    // Should complete quickly - accounting for test framework overhead and
    // built-in waits (3x 300ms in selectPocket + 3x 50ms explicit = ~1050ms minimum)
    // Allow 2 seconds total to account for CI variability
    expect(totalTime).toBeLessThan(2000);

    // Final calculation should be correct
    expect(await aceHelper.isGhostBallVisible()).toBe(true);
  });

  test('should show shot type classification', async ({ page, aceHelper }) => {
    // USER INTENT: "What kind of shot is this?"

    await aceHelper.dragBallToTable(0, 30, 40);
    await aceHelper.dragBallToTable(1, 60, 25);
    await aceHelper.selectObjectBall(1);
    await aceHelper.selectPocket('TR');

    // Shot type should be displayed in palette (use specific parent since ID is duplicated)
    const shotType = page.locator('#palette-shot #shotTypeDisplay-palette');
    await expect(shotType).toBeVisible();
    // Poll for the classification: '--' is the placeholder before the app calculates it
    await expect(shotType).not.toHaveText('--', { timeout: 10000 });
  });
});
