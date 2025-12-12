import { test as base, expect, Page } from '@playwright/test';

/**
 * Custom fixtures and utilities for ACE Shot Diagrams tests
 */

// Pocket ID mappings
export const POCKETS = {
  TL: 'top-left',
  TR: 'top-right',
  ML: 'middle-left',
  MR: 'middle-right',
  BL: 'bottom-left',
  BR: 'bottom-right'
};

/**
 * Helper class for ACE Shot Diagrams interactions
 */
export class AceShotHelper {
  constructor(private page: Page) {}

  // ==================== Ball Placement ====================
  
  async dragBallToTable(ballNumber: number, x: number, y: number) {
    const ballSelector = `#palette-balls .ball-item[data-ball="${ballNumber}"]`;
    await this.page.dragAndDrop(ballSelector, '#pool-table-svg', {
      targetPosition: { x, y }
    });
    await this.waitForShotCalculation();
  }

  async selectObjectBall(ballNumber: number) {
    await this.page.dblclick(`#ball-${ballNumber}`);
    await this.waitForShotCalculation();
  }

  async isBallOnTable(ballNumber: number): Promise<boolean> {
    return await this.page.locator(`#ball-${ballNumber}`).isVisible();
  }

  // ==================== Pocket Selection ====================

  async selectPocket(pocketId: string) {
    const pocketName = POCKETS[pocketId] || pocketId;
    await this.page.click(`.pocket-target[data-pocket="${pocketName}"]`);
    await this.waitForShotCalculation();
  }

  async getSelectedPocket(): Promise<string | null> {
    const selected = await this.page.locator('.pocket-target.selected');
    if (await selected.count() === 0) return null;
    return await selected.getAttribute('data-pocket');
  }

  // ==================== Shot Analysis ====================

  async waitForShotCalculation() {
    await this.page.waitForTimeout(150);
  }

  async isGhostBallVisible(): Promise<boolean> {
    return await this.page.locator('#ghost-ball-indicator').isVisible();
  }

  async getCutAngle(): Promise<number | null> {
    const cutAngleText = await this.page.locator('#cutAngleDisplay').textContent();
    if (!cutAngleText) return null;
    const match = cutAngleText.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  async isTargetLineVisible(): Promise<boolean> {
    return await this.page.locator('#target-line').isVisible();
  }

  async isCueBallPathVisible(): Promise<boolean> {
    return await this.page.locator('#cue-ball-path').isVisible();
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
    const helper = new AceShotHelper(page);
    await use(helper);
  },
});

export { expect };
