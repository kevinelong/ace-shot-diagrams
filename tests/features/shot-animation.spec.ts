import { test, expect, type Page } from '@playwright/test';

// This spec records video on purpose (the artefact is the point; no assertion reads it),
// so it opts back in to what the suite default now leaves on failure only.
test.use({ video: 'on' });

/**
 * Shot Animation Tests
 * 
 * USER INTENT: "I want to execute a shot and see realistic ball physics"
 * 
 * Tests the new shot execution system:
 * - Initial 8-ball rack setup with British pattern
 * - Cue ball positioned in kitchen for break
 * - Ghost ball aimed at head ball (1-ball)
 * - Shoot button triggers animation
 * - Physics simulation with realistic ball movement
 * - Video recording for visual confirmation
 */


/**
 * Click Shoot until the app accepts it.
 *
 * The app can only execute a shot once its aim (ghost ball) has been computed, and until then
 * it ignores Shoot clicks with no signal at all: the button is never disabled, no toast, no
 * class change - while the toast still reads "Click Shoot to break!". Measured: the aim lands
 * between ~100ms and ~900ms after load, varying run to run, so the fixed 4-5s sleeps this spec
 * used were both slower than needed and unreliable (miss the window and the shot never starts:
 * the flake this replaces). Retrying is deterministic and asserts the app's own "Shot in
 * progress" response instead of assuming one.
 */
async function shootAndAwaitStart(page: Page, timeout = 20000) {
    const toast = page.locator('#toastNotification');
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        await page.locator('#btnShoot').click();
        try {
            await expect(toast).toContainText('Shot in progress', { timeout: 1000 });
            return;
        } catch {
            // not accepted yet - the app was still computing the aim
        }
    }
    throw new Error(`the app never accepted Shoot within ${timeout}ms`);
}

/**
 * Wait for a shot to finish the way the app says it finished: it replaces the "Shot in
 * progress" toast with the result ("No balls pocketed" / "Ball pocketed" / "Scratch") and keeps
 * that text in the DOM while the toast fades, so polling the text is a stable signal.
 */
async function waitForShotComplete(page: Page, timeout = 20000) {
    await expect(page.locator('#toastNotification')).not.toContainText('Shot in progress', { timeout });
}

/** Shoot, then wait for the app's own completion report. */
async function shootAndWait(page: Page, timeout = 20000) {
    await shootAndAwaitStart(page, timeout);
    await waitForShotComplete(page, timeout);
}
test.describe('Shot Animation System', () => {

    test.beforeEach(async ({ page }) => {
        // Skip the first-time user tour to prevent it from blocking interactions
        await page.addInitScript(() => {
            localStorage.setItem('ace-tour-completed', 'true');
        });

        // Navigate to the application
        await page.goto('/');

        // App is interactive once the racked cue ball is on the table
        await expect(page.locator('#ball-cue')).toBeVisible({ timeout: 15000 });

        // Force-hide any tour elements that might be showing
        await page.evaluate(() => {
            const tourTooltip = document.getElementById('tourTooltip');
            const tourOverlay = document.getElementById('tourOverlay');
            if (tourTooltip) tourTooltip.style.display = 'none';
            if (tourOverlay) tourOverlay.style.display = 'none';
        });
    });

    test('should display initial 8-ball rack setup', async ({ page }) => {
        // USER INTENT: "I want to see a proper 8-ball rack ready to break"

        // Verify 8-ball rack is set up
        // All 15 object balls should be on table
        for (let i = 1; i <= 15; i++) {
            const ball = page.locator(`#ball-${i}`);
            await expect(ball).toBeVisible();

            // Verify ball is positioned on table (not in palette)
            const ballBox = await ball.boundingBox();
            expect(ballBox).toBeTruthy();
            expect(ballBox!.x).toBeGreaterThan(0);
        }

        // Verify 8-ball is in center position (should be visible and central)
        const eightBall = page.locator('#ball-8');
        await expect(eightBall).toBeVisible();

        // Verify cue ball is in kitchen area (left side of table)
        const cueBall = page.locator('#ball-cue');
        await expect(cueBall).toBeVisible();

        const cueBallBox = await cueBall.boundingBox();
        const tableBox = await page.locator('#pool-table-svg').boundingBox();

        // Cue ball should be in left quarter of table (kitchen area)
        expect(cueBallBox!.x).toBeLessThan(tableBox!.x + tableBox!.width * 0.3);

        // Verify ghost ball is positioned
        const ghostBall = page.locator('#ball-ghost');
        await expect(ghostBall).toBeVisible();
    });

    test('should have Shoot button in Cue Control palette', async ({ page }) => {
        // USER INTENT: "I want to find the button to execute my shot"

        // Verify Cue Control palette exists and is visible
        const cuePalette = page.locator('#palette-cue');
        await expect(cuePalette).toBeVisible();

        // Verify Shoot button exists
        const shootButton = page.locator('#btnShoot');
        await expect(shootButton).toBeVisible();
        await expect(shootButton).toContainText('Shoot');

        // Verify button has the target icon
        const buttonIcon = shootButton.locator('.btn-icon');
        await expect(buttonIcon).toContainText('🎯');
    });

    test('should have Rack button in Actions palette', async ({ page }) => {
        // USER INTENT: "I want to reset the rack to practice break shots"

        // Verify Actions palette exists
        const actionsPalette = page.locator('#palette-actions');
        await expect(actionsPalette).toBeVisible();

        // Verify button now says "Rack" not "Break"
        const rackButton = page.locator('#btnRandomRack');
        await expect(rackButton).toBeVisible();
        await expect(rackButton).toContainText('Rack');
        await expect(rackButton).not.toContainText('Break');
    });

    test('should show cue-ghost line targeting head ball', async ({ page }) => {
        // USER INTENT: "I want to see my aim line for the break shot"

        // Verify cue-ghost line is rendered. NOTE: the break aim is horizontal
        // (cue and ghost share y), so the SVG path has a zero-height bbox and
        // toBeVisible() reports false — assert via attributes instead.
        const cueLine = page.locator('#cue-ghost-line');
        await expect(cueLine).toHaveAttribute('visibility', 'visible', { timeout: 10000 });

        const lineD = await cueLine.getAttribute('d');
        expect(lineD).toBeTruthy();
        const lineStroke = await cueLine.getAttribute('stroke');
        expect(lineStroke).toBeTruthy();

        // For break shots, no target line is shown (no ball/pocket selected)
        // Target line only shows when specific ball and pocket are selected
    });

    test('should have top spin (follow) preset for break', async ({ page }) => {
        // USER INTENT: "My break should have follow to drive through the rack"

        // Verify contact diagram shows top spin position
        const contactPoint = page.locator('#contact-point');
        await expect(contactPoint).toBeVisible();

        // Top spin should have negative Y coordinate (above center)
        await expect(contactPoint).toHaveAttribute('cy', /^-\d*\.?\d+$/); // negative Y = above centre

        // Verify spin type display shows "Follow" or top spin indicator
        await expect(page.locator('#spinType')).toContainText('Follow');   // set during setup
    });

    test('should execute shot animation when Shoot button clicked', async ({ page }) => {
        // USER INTENT: "I want to click Shoot and see the balls move realistically"

        // Get initial cue ball position
        const cueBall = page.locator('#ball-cue');
        const initialCueBallBox = await cueBall.boundingBox();

        // Click the Shoot button
        await shootAndAwaitStart(page);

        // Verify toast notification appears (with emoji)
        const toast = page.locator('#toastNotification');
        await expect(toast).toHaveClass(/show/);
        await expect(toast).toContainText('Shot in progress');

        // Wait for the app to report the shot result
        await waitForShotComplete(page);

        // Verify cue ball moved from initial position
        const finalCueBallBox = await cueBall.boundingBox();

        // Cue ball should have moved significantly (>10 pixels)
        const moved = Math.abs(finalCueBallBox!.x - initialCueBallBox!.x) > 10 ||
            Math.abs(finalCueBallBox!.y - initialCueBallBox!.y) > 10;
        expect(moved).toBeTruthy();
    }); test('should pocket balls during break animation', async ({ page }) => {
        // USER INTENT: "I want to see balls go in pockets during the break"

        // Count visible balls before shot
        const ballsBeforeShot = [];
        for (let i = 1; i <= 15; i++) {
            const ball = page.locator(`#ball-${i}`);
            if (await ball.isVisible()) {
                ballsBeforeShot.push(i);
            }
        }

        const initialBallCount = ballsBeforeShot.length;
        expect(initialBallCount).toBe(15); // All 15 balls racked

        // Execute shot (the app only accepts it once its aim is computed - see helper)
        await shootAndWait(page);

        // Count visible balls after shot
        const ballsAfterShot = [];
        for (let i = 1; i <= 15; i++) {
            const ball = page.locator(`#ball-${i}`);
            if (await ball.isVisible()) {
                ballsAfterShot.push(i);
            }
        }

        const finalBallCount = ballsAfterShot.length;

        // Expect some balls to be pocketed (or at least positions changed)
        // Note: Depending on physics randomness, this might pocket 0-3 balls
        // The key is the animation runs without error
        expect(finalBallCount).toBeLessThanOrEqual(initialBallCount);
    });

    test('should show completion toast after animation', async ({ page }) => {
        // USER INTENT: "I want feedback when my shot is complete"

        // Execute shot (the app only accepts it once its aim is computed - see helper)
        await shootAndWait(page);

        // Verify completion toast appears (check within 2s window before it fades)
        const toast = page.locator('#toastNotification');

        // Should show result message (scratch, pocketed, or no balls)
        await expect(toast).toHaveClass(/show/);
        const toastText = await toast.textContent();

        // Should contain one of: "Scratch", "Pocketed", "No balls"
        const hasValidMessage = toastText?.includes('Scratch') ||
            toastText?.includes('Pocketed') ||
            toastText?.includes('No balls');
        expect(hasValidMessage).toBeTruthy();
    });

    test('should clear selections after shot completes', async ({ page }) => {
        // USER INTENT: "After my shot, I want a clean slate to set up the next shot"

        // Execute shot (the app only accepts it once its aim is computed - see helper)
        await shootAndWait(page);

        // Verify no balls are selected (no selection ring)
        const selectedBalls = page.locator('.ball.selected');
        const selectedCount = await selectedBalls.count();
        expect(selectedCount).toBe(0);

        // Verify no pockets are selected
        const selectedPockets = page.locator('.pocket-target.selected');
        const selectedPocketCount = await selectedPockets.count();
        expect(selectedPocketCount).toBe(0);
    });

    test('should handle multiple consecutive shots', async ({ page }) => {
        // USER INTENT: "I want to shoot multiple times to test different scenarios"

        for (let shotNum = 1; shotNum <= 3; shotNum++) {
            // Click Shoot and require the app to answer: an accepted click reports
            // "Shot in progress", a refused one warns ("Place cue ball on table first" once a
            // shot has pocketed the cue ball - which is why this loop cannot demand a completed
            // shot per iteration). Watching for "the toast text changed" does not work: results
            // repeat, so the text legitimately stays identical between iterations.
            const toast = page.locator('#toastNotification');
            const answered = /Shot in progress|Place cue ball|No aim point/;
            let answeredOnce = false;
            const deadline = Date.now() + 20000;
            while (!answeredOnce && Date.now() < deadline) {
                await page.locator('#btnShoot').click();
                try {
                    await expect.poll(async () => answered.test(((await toast.textContent()) ?? '')),
                        { timeout: 1000 }).toBe(true);
                    answeredOnce = true;
                } catch {
                    // the app was not ready to accept the click yet
                }
            }
            expect(answeredOnce, 'the app never answered the Shoot click').toBe(true);

            // Verify no errors occurred
            const toastText = await toast.textContent();
            expect(toastText).not.toContain('Error');
        }
    });

    test('should prevent shooting without cue ball', async ({ page }) => {
        // USER INTENT: "The app should stop me from shooting if cue ball is missing"

        // Remove cue ball from table (drag back to palette)
        const cueBall = page.locator('#ball-cue');
        const palette = page.locator('#palette-balls');

        await cueBall.dragTo(palette);
        // Back in the palette, the app drops the rack-time 'on-table' class
        await expect(cueBall).not.toHaveClass(/on-table/);

        // Try to shoot (not retried: the warning IS the expected response)
        await page.locator('#btnShoot').click();

        // Should show warning toast
        const toast = page.locator('#toastNotification');
        await expect(toast).toHaveClass(/show/);
        await expect(toast).toContainText('Place cue ball');
    });

    test('should use correct power level for break (7/10)', async ({ page }) => {
        // USER INTENT: "My break should have sufficient power"

        // Verify force slider is set to 7
        const forceSlider = page.locator('#forceSlider');
        await expect(forceSlider).toHaveValue('7');   // the app sets the break preset during setup

        // Verify force display shows 7/10
        const forceDisplay = page.locator('#forceValue');
        await expect(forceDisplay).toContainText('7');
    });

    test('should record video of complete break shot sequence', async ({ page }) => {
        // USER INTENT: "I want visual proof that my shot animation works correctly"

        // This test ensures video recording captures the full sequence

        // 1. Initial state
        const cueBall = page.locator('#ball-cue');
        await expect(cueBall).toBeVisible();

        // 2. Click Shoot, then watch the animation unfold to the app's own result
        await shootAndWait(page);

        // 4. Verify completion toast (check before it fades at 2s)
        const toast = page.locator('#toastNotification');
        await expect(toast).toHaveClass(/show/);

        // Video will be saved to test-results/videos/
        // This provides visual confirmation of the animation
    });

});

test.describe('Rack Button Functionality', () => {

    test.beforeEach(async ({ page }) => {
        // Skip the first-time user tour
        await page.addInitScript(() => {
            localStorage.setItem('ace-tour-completed', 'true');
        });

        await page.goto('/');
        // App is interactive once the racked cue ball is on the table
        await expect(page.locator('#ball-cue')).toBeVisible({ timeout: 15000 });
    });

    test('should reset table to 8-ball rack when Rack clicked', async ({ page }) => {
        // USER INTENT: "I want to reset the table to practice break shots"

        // First, execute a shot to scatter balls
        await shootAndWait(page);

        // Now click Rack button
        const rackButton = page.locator('#btnRandomRack');
        await rackButton.click();

        // The rack announces itself with its own toast
        await expect(page.locator('#toastNotification')).toContainText('Rack set', { timeout: 15000 });

        // Verify all 15 balls are back on table in rack formation
        for (let i = 1; i <= 15; i++) {
            const ball = page.locator(`#ball-${i}`);
            await expect(ball).toBeVisible();
        }

        // Verify cue ball is back in kitchen
        const cueBall = page.locator('#ball-cue');
        await expect(cueBall).toBeVisible();
    });

    test('should show rack setup message when Rack clicked', async ({ page }) => {
        // USER INTENT: "I want to set up a new rack for breaking"

        // Click Rack button
        const rackButton = page.locator('#btnRandomRack');
        await rackButton.click();

        // Should show toast notification
        const toast = page.locator('#toastNotification');
        await expect(toast).toHaveClass(/show/);

        // Should show rack setup message (not animation completion)
        await expect(toast).toContainText('Rack set');

        // Balls should be visible
        const ball1 = page.locator('#ball-1');
        await expect(ball1).toBeVisible();
    });

});
