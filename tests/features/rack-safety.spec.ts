import { test, expect, type Page } from '@playwright/test';
import { waitForRackSet, waitForShotComplete } from '../setup/test-helpers';

/**
 * Rack safety and empty-felt affordance.
 *
 * Covers the UX changes:
 * - Rack asks before destroying a populated layout.
 * - An empty felt offers an obvious Auto-Rack Layout action.
 * - Switching game mode no longer re-racks (and therefore no longer deletes
 *   the user's layout).
 */

interface BallPosition {
  x: number;
  y: number;
}

/**
 * The app's documented test API (window.DEBUG in index.html). This is the one
 * boundary where the untyped page global becomes typed; callbacks below use it
 * inside page.evaluate, where it exists at runtime.
 */
interface AceDebugApi {
  balls: () => Record<string, BallPosition | null>;
  cue: () => BallPosition | null;
  state: () => { power: number; aimReady: boolean };
  placeBall: (ballId: string, x: number, y: number) => unknown;
  selectBall: (ballId: string) => unknown;
  selectPocket: (pocketId: string) => unknown;
  hidePanels: () => unknown;
  showPanels: () => unknown;
}

declare global {
  interface Window {
    // Supplied by index.html's documented test API.
    DEBUG: AceDebugApi;
  }
}

function readLayout(page: Page) {
  return page.evaluate(() => {
    return {
      b1: window.DEBUG.balls()['1'],
      cue: window.DEBUG.cue(),
      power: window.DEBUG.state().power,
    };
  });
}

test.describe('Rack safety', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ace-tour-completed', 'true');
    });
  });

  test('Rack confirmation can be cancelled, preserving the layout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    // Move the balls away from their rack slots so a re-rack is detectable.
    await page.evaluate(() => {
      window.DEBUG.placeBall('1', 30, 10);
      window.DEBUG.placeBall('cue', 10, 40);
      // The initial rack left its own toast behind; replace it so a new rack
      // (or the absence of one) is unambiguous.
      document.getElementById('toastNotification')!.textContent = 'SENTINEL';
    });
    const before = await readLayout(page);

    await page.locator('#btnRandomRack').click();
    const rackDialog = page.locator('#rackConfirm');
    await expect(rackDialog).toBeVisible();
    await expect(rackDialog).toContainText(/clear the current ball layout/i);
    await page.locator('#rackConfirmCancel').click();
    await expect(rackDialog).toBeHidden();

    // No re-rack: the custom layout is untouched and no Rack set toast.
    // Do not assert the exact toast text: the standalone offline notice may
    // legitimately overwrite the sentinel after the initial /me failure.
    expect(await readLayout(page)).toEqual(before);
    await expect(page.locator('#toastNotification')).not.toContainText('Rack set');
  });

  test('Rack confirmation can be accepted and re-racks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    await page.evaluate(() => {
      window.DEBUG.placeBall('1', 30, 10);
    });

    await page.locator('#btnRandomRack').click();
    await page.locator('#rackConfirmAccept').click();
    await waitForRackSet(page);

    // The 1-ball is back in the rack (right half of the table).
    const position = await page.evaluate(() => window.DEBUG.balls()['1']);
    expect(position).not.toBeNull();
    expect(position!.x).toBeGreaterThan(70);
    await expect(page.locator('#ball-1')).toBeVisible();
  });

  test('empty felt offers Auto-Rack Layout and racks without a prompt', async ({ page }) => {
    await page.goto('/?empty=1');

    const hint = page.locator('#btnEmptyRack');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('Auto-Rack Layout');

    await hint.click();
    await expect(page.locator('#rackConfirm')).toBeHidden();
    await waitForRackSet(page);
    await expect(hint).toBeHidden();
    await expect(page.locator('#ball-1')).toBeVisible();
  });

  test('empty-felt shortcut is keyboard operable', async ({ page }) => {
    await page.goto('/?empty=1');

    const hint = page.locator('#btnEmptyRack');
    await expect(hint).toBeVisible();
    await hint.focus();
    await expect(hint).toBeFocused();
    await page.keyboard.press('Enter');
    await waitForRackSet(page);
    // The prompt disappears; focus moves to the next useful action.
    await expect(page.locator('#btnShoot')).toBeFocused();
  });

  test('empty-felt prompt returns after the last object ball is pocketed', async ({ page }) => {
    await page.goto('/?empty=1');

    await page.evaluate(() => {
      window.DEBUG.placeBall('cue', 80, 20);
      window.DEBUG.placeBall('1', 95, 5);
      window.DEBUG.selectBall('1');
      window.DEBUG.selectPocket('corner-tr');
    });

    await expect(page.locator('#btnEmptyRack')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.DEBUG.state().aimReady)).toBe(true);

    await page.locator('#btnShoot').click();
    await waitForShotComplete(page);

    await expect(page.locator('#btnEmptyRack')).toBeVisible();
  });

  test('empty-felt prompt ignores a cue ball visually but protects its position', async ({ page }) => {
    await page.goto('/?empty=1');

    const hint = page.locator('#btnEmptyRack');
    await expect(hint).toBeVisible();

    // A cue ball alone still counts as an empty felt (no object balls)...
    await page.evaluate(() => {
      window.DEBUG.placeBall('cue', 50, 25);
    });
    await expect(hint).toBeVisible();

    // ...but racking would move the cue, so it asks first.
    await hint.click();
    const rackDialog = page.locator('#rackConfirm');
    await expect(rackDialog).toBeVisible();
    await expect(rackDialog).toContainText(/clear the current ball layout/i);
    await page.locator('#rackConfirmCancel').click();
    await expect(rackDialog).toBeHidden();
    expect(await page.evaluate(() => window.DEBUG.cue())).toEqual({ x: 50, y: 25 });

    // The first object ball means the felt is no longer empty.
    await page.evaluate(() => {
      window.DEBUG.placeBall('3', 40, 20);
    });
    await expect(hint).toBeHidden();
  });

  test('switching game mode preserves the layout and does not re-rack', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    await page.evaluate(() => {
      window.DEBUG.placeBall('1', 30, 10);
      window.DEBUG.placeBall('cue', 10, 40);
      // Sentinel: a re-rack would overwrite this with its own toast.
      document.getElementById('toastNotification')!.textContent = 'SENTINEL';
    });
    const before = await readLayout(page);

    // Game palette starts minimized; expand and switch rules.
    await page.locator('#palette-game .palette-btn.minimize').click();
    await page.selectOption('#gameModeSelect-palette', '8ball');
    await expect(page.locator('#gameModeDescription-palette')).toContainText(/suit/i);

    expect(await readLayout(page)).toEqual(before);
    await expect(page.locator('#toastNotification')).not.toContainText('Rack set');
    expect(pageErrors).toEqual([]);
  });

  test('global panel hide also hides the empty-felt prompt', async ({ page }) => {
    await page.goto('/?empty=1');
    const hint = page.locator('#btnEmptyRack');
    await expect(hint).toBeVisible();

    await page.evaluate(() => {
      window.DEBUG.hidePanels();
    });
    await expect(hint).toBeHidden();

    await page.evaluate(() => {
      window.DEBUG.showPanels();
    });
    await expect(hint).toBeVisible();
  });
});

test.describe('Rack safety - mobile', () => {
  test('empty-felt prompt is visible and usable at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('ace-tour-completed', 'true');
    });
    await page.goto('/?empty=1');

    const hint = page.locator('#btnEmptyRack');
    await expect(hint).toBeVisible();
    const box = await hint.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);

    await hint.click();
    await waitForRackSet(page);
  });
});
