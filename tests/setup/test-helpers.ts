import { test as base, expect, Page } from '@playwright/test';

/**
 * Custom fixtures and utilities for ACE Shot Diagrams tests
 */

// Pocket ID mappings (match data-pocket attribute values in HTML)
export const POCKETS = {
  TL: 'corner-tl',
  TR: 'corner-tr',
  ML: 'side-top',    // Note: "middle-left" in tests maps to side pockets
  MR: 'side-bottom', // The HTML uses side-top/side-bottom for center pockets
  BL: 'corner-bl',
  BR: 'corner-br'
};

/**
 * Helper class for ACE Shot Diagrams interactions
 */
/**
 * Click Shoot until the app accepts it.
 *
 * The app accepts a shot only once its ghost-ball aim has been computed, which lands anywhere
 * in ~100-900ms after load and varies run to run; until then it ignores the click with no
 * signal at all (the button is never disabled, no toast, no class change) while the toast still
 * invites the user to shoot. Retrying is deterministic and asserts the app's own "Shot in
 * progress" response instead of sleeping and hoping.
 */
export async function shootAndAwaitStart(page: Page, timeout = 20000) {
    const toast = page.locator('#toastNotification');
    // The app accepts a shot exactly when its aim exists (executeShot needs the cue and the
    // ghost), and DEBUG.state().aimReady is that condition. This used to click in a loop because
    // the app refuses silently and offers no readiness signal.
    await expect.poll(async () => (await page.evaluate(() => window.DEBUG.state())).aimReady,
      { timeout, message: 'the app never reached a state where it could shoot' }).toBe(true);
    await page.locator('#btnShoot').click();
    await expect(toast).toContainText('Shot in progress', { timeout: 5000 });
}

/**
 * Wait for a shot to finish the way the app says it finished: it replaces the "Shot in
 * progress" toast with the result ("No balls pocketed" / "Ball pocketed" / "Scratch") and keeps
 * that text in the DOM while the toast fades, so polling the text is a stable signal.
 */
export async function waitForShotComplete(page: Page, timeout = 20000) {
    await expect(page.locator('#toastNotification')).not.toContainText('Shot in progress', { timeout });
}

/** Shoot, then wait for the app's own completion report. */
export async function shootAndWait(page: Page, timeout = 20000) {
    await shootAndAwaitStart(page, timeout);
    await waitForShotComplete(page, timeout);
}

/** The rack announces itself with its own toast; that is the end of the rack animation. */
export async function waitForRackSet(page: Page, timeout = 15000) {
    await expect(page.locator('#toastNotification')).toContainText('Rack set', { timeout });
}

export class AceShotHelper {
  constructor(private page: Page) {}

  // ==================== Navigation ====================

  /**
   * Navigate to app with empty table (no initial rack)
   * Use this for tests that need to place balls from scratch
   */
  async gotoEmpty() {
    await this.page.goto('/?empty=1');
    await this.page.waitForLoadState('networkidle');
    await this.hideTourElements();
    await this.repositionPalettesForTesting();
    // The board being up is the app's own signal that setup finished
    await this.page.locator('#pool-table-svg').waitFor({ state: 'visible' });
  }

  /**
   * Navigate to app with default rack
   * Use this for tests that work with the 8-ball rack
   */
  async gotoWithRack() {
    await this.page.goto('/');
    await this.hideTourElements();
    await this.repositionPalettesForTesting();
    await this.page.locator('#pool-table-svg').waitFor({ state: 'visible' });
    // The rack's break preset (follow, power 7) lands after the board appears; a test that sets
    // spin or power must not have its value overwritten by it.
    await this.waitForAppReady();
  }

  /**
   * Force-hide any tour elements that might be blocking interactions
   */
  private async hideTourElements() {
    await this.page.evaluate(() => {
      const tourTooltip = document.getElementById('tourTooltip');
      const tourOverlay = document.getElementById('tourOverlay');
      if (tourTooltip) tourTooltip.style.display = 'none';
      if (tourOverlay) tourOverlay.style.display = 'none';
      // Also mark tour as completed to prevent future prompts
      localStorage.setItem('ace-tour-completed', 'true');
    });
  }

  /**
   * Minimize all palettes to prevent them from blocking table interactions
   */
  async minimizeAllPalettes() {
    await this.page.evaluate(() => {
      // Minimize each palette by clicking its minimize button or setting minimized state
      document.querySelectorAll('.tool-palette').forEach(palette => {
        const body = palette.querySelector('.palette-body') as HTMLElement;
        if (body) {
          body.style.display = 'none';
          palette.classList.add('minimized');
        }
      });
    });
  }

  /**
   * Minimize palettes that might overlap the table center during tests
   * Keep balls palette accessible for dragging
   * Show shot palette for shot info tests (it's hidden by default CSS)
   */
  async repositionPalettesForTesting() {
    await this.page.evaluate(() => {
      // Minimize palettes that aren't needed for testing
      // Keep balls palette expanded for dragging
      const palettesToMinimize = ['palette-game', 'palette-cue'];
      palettesToMinimize.forEach(id => {
        const palette = document.getElementById(id);
        if (palette) {
          const body = palette.querySelector('.palette-body') as HTMLElement;
          if (body) body.style.display = 'none';
        }
      });

      // Show shot palette (hidden by default in CSS)
      const shotPalette = document.getElementById('palette-shot');
      if (shotPalette) {
        shotPalette.style.display = 'block';
      }
    });
  }

  // ==================== Ball Placement ====================

  /**
   * Convert ball number to ball ID
   * 0 = cue, 1-15 = numbered balls, 16 = gray
   */
  private getBallId(ballNumber: number): string {
    if (ballNumber === 0) return 'cue';
    if (ballNumber === 16) return 'gray';
    return ballNumber.toString();
  }

  /**
   * Run a DEBUG.* action until the app's own state shows it took effect.
   *
   * The app ignores DEBUG.* calls until it has finished its initial setup - the same window in
   * which it ignores the Shoot button (measured: ~100-900ms after load, varying per run) - and
   * it reports nothing when it ignores them. A 300ms sleep used to paper over that: it hid the
   * dropped action behind a hopeful pause. Retrying is deterministic, and it fails loudly with
   * the last observed state if the app never applies the action.
   */
  private async actUntilApplied<T>(
    action: () => Promise<void>,
    observed: () => Promise<T>,
    satisfied: (value: T) => boolean,
    what: string,
    timeout = 10000,
  ): Promise<void> {
    const deadline = Date.now() + timeout;
    let last: T | undefined;
    while (Date.now() < deadline) {
      await action();
      try {
        await expect.poll(async () => { last = await observed(); return satisfied(last); },
          { timeout: 500 }).toBe(true);
        return;
      } catch {
        // the app was not ready to accept this action yet
      }
    }
    throw new Error(`${what} never took effect (last observed: ${JSON.stringify(last)})`);
  }

  /**
   * Place a ball on the table at the specified SVG coordinates.
   * Uses the app's DEBUG.placeBall API for proper state management.
   * Coordinates are in SVG units (table is roughly 0-100 x, 0-50 y)
   */
  async dragBallToTable(ballNumber: number, svgX: number, svgY: number) {
    const ballId = this.getBallId(ballNumber);

    // Use the app's DEBUG API to place the ball
    await this.actUntilApplied(
      () => this.page.evaluate(({ ballId, svgX, svgY }) => {
        // @ts-ignore - accessing global DEBUG object
        if (!window.DEBUG || !window.DEBUG.placeBall) {
          throw new Error('DEBUG.placeBall API not available');
        }
        // @ts-ignore
        window.DEBUG.placeBall(ballId, svgX, svgY);
      }, { ballId, svgX, svgY }),
      async () => (await this.page.evaluate(() => window.DEBUG.state())).ballPositions[ballId],
      (pos) => !!pos && Math.abs(pos.x - svgX) + Math.abs(pos.y - svgY) < 0.5,
      `${ballId} should land at ${svgX},${svgY}`,
    );
  }

  async selectObjectBall(ballNumber: number) {
    const ballId = this.getBallId(ballNumber);

    // Use the app's DEBUG API for reliable ball selection
    await this.actUntilApplied(
      () => this.page.evaluate((ballId) => {
        // @ts-ignore - accessing global DEBUG object
        if (window.DEBUG && window.DEBUG.selectBall) {
          // @ts-ignore
          window.DEBUG.selectBall(ballId);
        } else {
          throw new Error('DEBUG.selectBall API not available');
        }
      }, ballId),
      async () => (await this.page.evaluate(() => window.DEBUG.state())).selectedBallId,
      (selected) => selected === ballId,
      `${ballId} should be selected`,
    );
  }

  async isBallOnTable(ballNumber: number): Promise<boolean> {
    const ballId = this.getBallId(ballNumber);
    return await this.page.locator(`#ball-${ballId}`).isVisible();
  }

  /**
   * Minimize the balls palette to prevent it from blocking pocket clicks
   * Call this after placing balls on the table
   */
  async minimizeBallsPalette() {
    await this.page.evaluate(() => {
      const palette = document.getElementById('palette-balls');
      if (palette) {
        const body = palette.querySelector('.palette-body') as HTMLElement;
        if (body) body.style.display = 'none';
      }
    });
  }

  // ==================== Pocket Selection ====================

  async selectPocket(pocketId: string) {
    const pocketName = POCKETS[pocketId] || pocketId;

    // Use the app's DEBUG API for reliable pocket selection
    await this.actUntilApplied(
      () => this.page.evaluate((pocketName) => {
        // @ts-ignore - accessing global DEBUG object
        if (window.DEBUG && window.DEBUG.selectPocket) {
          // @ts-ignore
          window.DEBUG.selectPocket(pocketName);
        } else {
          // Fallback to direct DOM manipulation + call selectPocket function
          const pocket = document.querySelector(`.pocket-target[data-pocket="${pocketName}"]`) as HTMLElement;
          if (pocket) pocket.click();
        }
      }, pocketName),
      async () => (await this.page.evaluate(() => window.DEBUG.state())).selectedPocket,
      (selected) => selected === pocketName,
      `${pocketName} should be the selected pocket`,
    );
  }

  async getSelectedPocket(): Promise<string | null> {
    const selected = await this.page.locator('.pocket-target.selected');
    if (await selected.count() === 0) return null;
    return await selected.getAttribute('data-pocket');
  }

  // ==================== Shot Analysis ====================

  // Every action below waits for its own effect, in the app's state. These used to call a
  // shared 300ms sleep ("shot calculations should be instant, but allow time for DOM
  // updates"): measured, the app applies each action within one frame, so it was dead time
  // paid on every place/select/set (a typical critical-path test spent ~1.2s in it).

  async isGhostBallVisible(): Promise<boolean> {
    // SVG elements use visibility attribute, not CSS display
    const visibility = await this.page.locator('#ghost-ball-indicator').getAttribute('visibility');
    return visibility === 'visible';
  }

  async getCutAngle(): Promise<number | null> {
    // Use palette version (specify parent since ID is duplicated)
    const cutAngleText = await this.page.locator('#palette-shot #cutAngleDisplay-palette').textContent();
    if (!cutAngleText) return null;
    const match = cutAngleText.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  async getDifficultyText(): Promise<string | null> {
    // Use palette version (specify parent since ID is duplicated)
    return await this.page.locator('#palette-shot #difficultyText-palette').textContent();
  }

  async getMakeProbability(): Promise<string | null> {
    // Specify parent since ID is duplicated
    return await this.page.locator('#palette-shot #makeProbabilityDisplay').textContent();
  }

  async getShotMiniInstructions(): Promise<string | null> {
    // Specify parent since ID is duplicated
    return await this.page.locator('#palette-shot #shotMiniInstructions').textContent();
  }

  async isTargetLineVisible(): Promise<boolean> {
    // SVG elements use visibility attribute, not CSS display
    const visibility = await this.page.locator('#target-line').getAttribute('visibility');
    return visibility === 'visible';
  }

  async isCueBallPathVisible(): Promise<boolean> {
    // SVG elements use visibility attribute, not CSS display
    const visibility = await this.page.locator('#cue-ball-path').getAttribute('visibility');
    return visibility === 'visible';
  }

  /**
   * Wait for the app to finish its own break setup.
   *
   * The app applies its break preset (follow spin, power 7) during initialisation, after the
   * rack is placed. Fast helpers now run before that lands, and the preset then overwrites
   * whatever the test set - so a test that sets spin or power must wait for setup first.
   * Waiting on the preset itself is the honest gate: it is the app saying "setup done".
   * (Racked tables only - `?empty=1` has no break preset.)
   */
  async waitForAppReady() {
    await expect(this.page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });
    await expect(this.page.locator('#forceValue-palette')).toContainText('7', { timeout: 15000 });
  }

  // ==================== English Controls ====================

  // english grid coords: x>0 right, y>0 top. The app stores contact offset with
  // y inverted (cy<0 = top spin), so map y -> -y when driving DEBUG.setEnglish.
  async setEnglish(x: number, y: number) {
    await this.page.evaluate(({ x, y }) => {
      // @ts-ignore
      window.DEBUG.setEnglish(x, -y);
    }, { x, y });
    // The app stores the contact offset with y inverted, and DEBUG.state() reports it: wait for
    // that rather than for a rendering effect (the contact point moves in cx for side english and
    // cy for top/bottom, so polling it was wrong for side english and a flake source).
    await this.actUntilApplied(
      async () => { /* the action already ran above */ },
      async () => (await this.page.evaluate(() => window.DEBUG.state())).english,
      (e) => !!e && Math.abs(e.x - x) < 1e-9 && Math.abs(e.y + y) < 1e-9,
      `english should be (${x}, ${y})`,
    );
  }

  // ==================== Power Control ====================

  // value on the app's 1-10 scale
  async setPower(value: number) {
    await this.actUntilApplied(
      () => this.page.evaluate((v) => {
        // @ts-ignore
        window.DEBUG.setPower(v);
      }, value),
      async () => (await this.page.evaluate(() => window.DEBUG.state())).power,
      (power) => power === value,
      `power should be ${value}`,
    );
  }

  // ==================== Solver / Shot Types ====================

  async enableKickSolver() {
    await this.actUntilApplied(
      () => this.page.evaluate(() => {
        // @ts-ignore
        window.DEBUG.setSolver('kick');
      }),
      async () => (await this.page.evaluate(() => window.DEBUG.state())).solver,
      (solver) => solver === 'kick',
      'kick solver should be active',
    );
  }

  async isKickModeActive(): Promise<boolean> {
    return await this.page.evaluate(() => {
      // @ts-ignore
      return window.DEBUG.state().solver === 'kick';
    });
  }

  // ==================== Game Modes ====================

  async setGameMode(mode: string) {
    await this.page.selectOption('#gameModeSelect-palette', mode);
    await expect.poll(async () => await this.page.locator('#gameModeSelect-palette').inputValue(),
      { message: `game mode select should show ${mode}` }).toBe(mode);
  }

  // ==================== Export & Save ====================

  async exportToPNG() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('button:has-text("Export PNG")');
    return await downloadPromise;
  }

  // ==================== Palettes ====================

  async minimizePalette(paletteId: string) {
    await this.page.click(`#palette-${paletteId} .palette-btn.minimize`);
  }

  async closePalette(paletteId: string) {
    await this.page.click(`#palette-${paletteId} .palette-btn.close`);
  }

  // ==================== State Management ====================

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }
}

export const test = base.extend<{ aceHelper: AceShotHelper }>({
  aceHelper: async ({ page }, use) => {
    // Add init script to skip tour on all navigations
    // This must be done before any goto() calls
    await page.addInitScript(() => {
      localStorage.setItem('ace-tour-completed', 'true');
    });

    // Auto-dismiss any confirm/alert dialogs (like the tour prompt)
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    const helper = new AceShotHelper(page);
    await use(helper);
  },
});

export { expect };
