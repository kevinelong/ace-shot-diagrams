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
export class AceShotHelper {
  constructor(private page: Page) {}

  // ==================== Navigation ====================

  /**
   * Navigate to app with empty table (no initial rack)
   * Use this for tests that need to place balls from scratch
   */
  async gotoEmpty() {
    await this.page.goto('/?empty=1');
    // Wait for page to fully load and initialize
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(300);
    await this.hideTourElements();
    await this.repositionPalettesForTesting();
    // Additional wait for app initialization
    await this.page.waitForTimeout(200);
  }

  /**
   * Navigate to app with default rack
   * Use this for tests that work with the 8-ball rack
   */
  async gotoWithRack() {
    await this.page.goto('/');
    await this.page.waitForTimeout(200);
    await this.hideTourElements();
    await this.repositionPalettesForTesting();
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
   * Place a ball on the table at the specified SVG coordinates.
   * Uses the app's DEBUG.placeBall API for proper state management.
   * Coordinates are in SVG units (table is roughly 0-100 x, 0-50 y)
   */
  async dragBallToTable(ballNumber: number, svgX: number, svgY: number) {
    const ballId = this.getBallId(ballNumber);

    // Use the app's DEBUG API to place the ball
    await this.page.evaluate(({ ballId, svgX, svgY }) => {
      // @ts-ignore - accessing global DEBUG object
      if (!window.DEBUG || !window.DEBUG.placeBall) {
        throw new Error('DEBUG.placeBall API not available');
      }
      // @ts-ignore
      window.DEBUG.placeBall(ballId, svgX, svgY);
    }, { ballId, svgX, svgY });

    await this.waitForShotCalculation();
  }

  async selectObjectBall(ballNumber: number) {
    const ballId = this.getBallId(ballNumber);

    // Use the app's DEBUG API for reliable ball selection
    await this.page.evaluate((ballId) => {
      // @ts-ignore - accessing global DEBUG object
      if (window.DEBUG && window.DEBUG.selectBall) {
        // @ts-ignore
        window.DEBUG.selectBall(ballId);
      } else {
        throw new Error('DEBUG.selectBall API not available');
      }
    }, ballId);

    await this.waitForShotCalculation();
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
    await this.page.evaluate((pocketName) => {
      // @ts-ignore - accessing global DEBUG object
      if (window.DEBUG && window.DEBUG.selectPocket) {
        // @ts-ignore
        window.DEBUG.selectPocket(pocketName);
      } else {
        // Fallback to direct DOM manipulation + call selectPocket function
        const pocket = document.querySelector(`.pocket-target[data-pocket="${pocketName}"]`) as HTMLElement;
        if (pocket) pocket.click();
      }
    }, pocketName);

    await this.waitForShotCalculation();
  }

  async getSelectedPocket(): Promise<string | null> {
    const selected = await this.page.locator('.pocket-target.selected');
    if (await selected.count() === 0) return null;
    return await selected.getAttribute('data-pocket');
  }

  // ==================== Shot Analysis ====================

  async waitForShotCalculation() {
    // Shot calculations should be instant, but allow time for DOM updates
    await this.page.waitForTimeout(300);
  }

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

  // ==================== English Controls ====================

  async setEnglish(x: number, y: number) {
    const gridX = Math.round((x + 1) * 1);
    const gridY = Math.round((1 - y) * 1);
    await this.page.click(`#english-selector .english-point[data-x="${gridX}"][data-y="${gridY}"]`);
    await this.waitForShotCalculation();
  }

  // ==================== Power Control ====================

  async setPower(percentage: number) {
    await this.page.locator('#forceSlider').fill(percentage.toString());
    await this.waitForShotCalculation();
  }

  // ==================== Game Modes ====================

  async setGameMode(mode: string) {
    await this.page.selectOption('#gameModeSelect', mode);
    await this.waitForShotCalculation();
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
