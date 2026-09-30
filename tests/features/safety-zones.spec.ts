import { test, expect } from '../setup/test-helpers';

/**
 * Feature: safety play - snooker zones (roadmap 2.2, first half).
 *
 * The aid shades the spots where the cue ball would leave the opponent snookered: no direct
 * pot on any ball, either because the cue cannot reach a ball's ghost point from there or
 * because that ball cannot reach a pocket. Direct lines only - no rails or kicks - the same
 * approximation the other position aids make.
 */
test.describe('Snooker Zones (safety)', () => {
  test('shades the snookered spots in a rack, and clears when switched off', async ({ page, aceHelper }) => {
    await aceHelper.gotoWithRack();
    await page.locator('#palette-aids .palette-btn.minimize').click();

    const group = page.locator('#snooker-zone-group');
    await expect(group).toBeHidden();

    await page.locator('#toggleSnookerZones').check();
    await expect(group).toBeVisible({ timeout: 10000 });
    expect(await group.locator('rect').count()).toBeGreaterThan(0);

    await page.locator('#toggleSnookerZones').uncheck();
    await expect(group).toBeHidden();
  });

  test('shades nothing when a single ball sits on an open table', async ({ page, aceHelper }) => {
    // With one ball and no blockers the opponent can pot it from anywhere, so no spot on the
    // table is a snooker. This is the property that makes the aid trustworthy rather than
    // decorative: it must be empty here.
    await aceHelper.gotoEmpty();
    await aceHelper.dragBallToTable(1, 88, 25);
    await page.locator('#palette-aids .palette-btn.minimize').click();

    await page.locator('#toggleSnookerZones').check();
    await expect(page.locator('#snooker-zone-group')).toBeHidden();
  });
});
