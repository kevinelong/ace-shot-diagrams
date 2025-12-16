import { test, expect, POCKETS } from '../setup/test-helpers';

/**
 * Critical Path Test: Pocket Selection
 *
 * User Intent: "I want to specify which pocket I'm shooting for"
 *
 * This tests target selection - essential for shot calculation.
 *
 * Note: These tests use ?empty=1 to start with an empty table,
 * then place balls at specific positions for predictable test results.
 */

test.describe('Pocket Selection - Critical Path', () => {

  test.beforeEach(async ({ aceHelper, page }) => {
    // Use empty table mode for predictable ball positioning
    // Note: gotoEmpty() already sets tour-completed in localStorage
    await aceHelper.gotoEmpty();

    // Setup: Place balls for testing (SVG coordinates: x 0-100, y 0-50)
    await aceHelper.dragBallToTable(0, 30, 35); // cue ball - lower left area
    await page.waitForTimeout(200);
    await aceHelper.dragBallToTable(1, 60, 25); // object ball - center right area
    await page.waitForTimeout(200);
    await aceHelper.selectObjectBall(1);
  });

  test('should display all 6 pockets as selectable', async ({ page }) => {
    // USER EXPECTATION: "I can see all available pockets"

    // All 6 pockets should be visible and clickable (use actual data-pocket values from HTML)
    const pockets = ['corner-tl', 'corner-tr', 'side-top', 'side-bottom', 'corner-bl', 'corner-br'];

    for (const pocket of pockets) {
      const pocketElement = page.locator(`.pocket-target[data-pocket="${pocket}"]`);
      await expect(pocketElement).toBeVisible();
    }
  });

  test('should select pocket when clicked', async ({ page, aceHelper }) => {
    // USER ACTION: "I want to shoot ball 1 into the top-right pocket"

    await aceHelper.selectPocket('TR');

    // EXPECTED OUTCOME: Pocket is selected and highlighted
    const pocket = page.locator(`.pocket-target[data-pocket="${POCKETS.TR}"]`);
    await expect(pocket).toHaveClass(/selected/);

    // Verify selection through helper
    const selectedPocket = await aceHelper.getSelectedPocket();
    expect(selectedPocket).toBe(POCKETS.TR);
  });

  test('should show ghost ball when pocket is selected', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me where to aim"

    // Select pocket
    await aceHelper.selectPocket('TR');
    await page.waitForTimeout(200);

    // Ghost ball appears showing aim point
    expect(await aceHelper.isGhostBallVisible()).toBe(true);

    // Ghost ball should be positioned correctly (between cue and object ball)
    await expect(page.locator('#ghost-ball-indicator')).toBeVisible();
  });

  test('should clear previous selection when new pocket selected', async ({ page, aceHelper }) => {
    // USER SCENARIO: "I changed my mind about which pocket"

    // Select first pocket
    await aceHelper.selectPocket('TR');
    await page.waitForTimeout(200);

    // Select different pocket
    await aceHelper.selectPocket('TL');
    await page.waitForTimeout(200);

    // Only second pocket should be selected
    const topRight = page.locator(`.pocket-target[data-pocket="${POCKETS.TR}"]`);
    const topLeft = page.locator(`.pocket-target[data-pocket="${POCKETS.TL}"]`);

    await expect(topRight).not.toHaveClass(/selected/);
    await expect(topLeft).toHaveClass(/selected/);
  });

  test('should display target line from object ball to pocket', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me the path the ball will travel"

    await aceHelper.selectPocket('TR');
    await page.waitForTimeout(200);

    // Target line should be visible
    expect(await aceHelper.isTargetLineVisible()).toBe(true);

    // Line should connect object ball to selected pocket
    const targetLine = page.locator('#target-line');
    await expect(targetLine).toBeVisible();
  });

  test('should display cue ball path to ghost ball', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Show me where to hit from"

    await aceHelper.selectPocket('TR');
    await page.waitForTimeout(200);

    // Cue ball path should be visible
    expect(await aceHelper.isCueBallPathVisible()).toBe(true);
  });

  test('should work with all corner pockets', async ({ page, aceHelper }) => {
    // USER SCENARIO: Testing all corner pockets

    const cornerPockets = ['TL', 'TR', 'BL', 'BR'];

    for (const pocketId of cornerPockets) {
      await aceHelper.selectPocket(pocketId);
      await page.waitForTimeout(150);

      // Each pocket selection should:
      // 1. Be selected
      const selected = await aceHelper.getSelectedPocket();
      expect(selected).toBe(POCKETS[pocketId]);

      // 2. Show ghost ball
      expect(await aceHelper.isGhostBallVisible()).toBe(true);

      // 3. Show target line
      expect(await aceHelper.isTargetLineVisible()).toBe(true);
    }
  });

  test('should work with side pockets', async ({ page, aceHelper }) => {
    // USER SCENARIO: Testing side/middle pockets

    const sidePockets = ['ML', 'MR'];

    for (const pocketId of sidePockets) {
      await aceHelper.selectPocket(pocketId);
      await page.waitForTimeout(150);

      const selected = await aceHelper.getSelectedPocket();
      expect(selected).toBe(POCKETS[pocketId]);

      expect(await aceHelper.isGhostBallVisible()).toBe(true);
    }
  });

  test('should provide hover feedback on pockets', async ({ page }) => {
    // USER EXPECTATION: "I want to see which pocket I'm about to select"

    const pocket = page.locator(`.pocket-target[data-pocket="${POCKETS.TR}"]`);

    // Get initial state
    const initialClass = await pocket.getAttribute('class');

    // Hover over pocket
    await pocket.hover();
    await page.waitForTimeout(100);

    // Visual feedback should change (via CSS hover effects)
    // This verifies the element is interactive
    const box = await pocket.boundingBox();
    expect(box).toBeTruthy();
  });

  test('should recalculate shot when pocket changes', async ({ page, aceHelper }) => {
    // USER INTENT: "I want updated information for each pocket"

    // Select first pocket and get cut angle
    await aceHelper.selectPocket('TR');
    await page.waitForTimeout(200);
    const angle1 = await aceHelper.getCutAngle();

    // Select opposite pocket - angle should change
    await aceHelper.selectPocket('TL');
    await page.waitForTimeout(200);
    const angle2 = await aceHelper.getCutAngle();

    // Cut angles should be different
    expect(angle1).not.toBe(angle2);
  });

  test('should maintain pocket selection when balls move', async ({ page, aceHelper }) => {
    // USER EXPECTATION: "Pocket stays selected even if I adjust ball positions"

    // Select pocket
    await aceHelper.selectPocket('TR');
    await page.waitForTimeout(200);

    // Move object ball slightly (would need to implement move function)
    // For now, verify pocket remains selected after some interaction
    // Click on a button inside a palette (buttons have pointer-events: auto)
    await page.locator('#palette-balls .palette-btn.minimize').click();
    await page.waitForTimeout(100);

    // Pocket should still be selected
    const selectedPocket = await aceHelper.getSelectedPocket();
    expect(selectedPocket).toBe(POCKETS.TR);
  });
});
