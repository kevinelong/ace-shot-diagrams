import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.use({ screenshot: 'on' });

/**
 * Export, share and save - the three README features that had no spec at all.
 *
 * The suite covered shots, racks, aiming, power, the palette and mobile layout,
 * but `Export PNG`, `Copy Link` and Save/Load were only ever checked by hand
 * (NEXT_STEPS.md records that pass, including the duplicate-id bug that lived in
 * exactly this markup). A regression here is silent: the page still looks right,
 * and only a user who clicks the button finds out.
 */

/**
 * The Game palette ships minimized; its controls are unreachable until it is open.
 *
 * The other palettes are also disabled for pointer events: a *minimized* palette still
 * keeps its title bar, and in a narrower viewport (CI's) the Aids palette's title sits
 * over `#btnSaveDiagram`, so Playwright refuses the click as intercepted. The repo's own
 * helpers do the same kind of thing for the balls palette ("to prevent it from blocking
 * pocket clicks"); this is a layout workaround, not a product fix.
 */
async function openPalette(page: Page, id: string) {
  await page.evaluate((paletteId) => {
    document.querySelectorAll('.tool-palette').forEach((p) => {
      const el = p as HTMLElement;
      if (el.id === paletteId) return;
      el.classList.add('minimized');
      el.style.pointerEvents = 'none';
    });
    const palette = document.getElementById(paletteId);
    if (!palette) throw new Error(`no palette ${paletteId}`);
    palette.classList.remove('minimized');
    palette.style.pointerEvents = '';
    const body = palette.querySelector('.palette-body') as HTMLElement | null;
    if (body) body.style.display = '';
  }, id);
  await expect(page.locator(`#${id}`)).toBeVisible();
}

test.describe('Export, share and save', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ace-tour-completed', 'true'));
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });
    await openPalette(page, 'palette-game');
  });

  test('Export PNG downloads a real PNG', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.locator('#btnExportPNG').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.png$/i);
    const path = await download.path();
    expect(path, 'the download must have produced a file').toBeTruthy();

    const bytes = readFileSync(path!);
    // The 8-byte PNG signature: a canvas that never rendered, or an empty blob,
    // would download a file that is not a PNG at all.
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(bytes.length).toBeGreaterThan(10_000);
  });

  test('Copy Link puts the shareable state on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('#btnCopyLink').click();

    // The clipboard is the product surface here - the toast is not evidence that
    // anything was written, and NEXT_STEPS.md records a retracted finding from
    // reading that toast's *shipped markup* as if it were behaviour.
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('#v1|');
    expect(text).toContain('cue:');
    expect(new URL(text).origin).toBe(new URL(page.url()).origin);
  });

  test('a named diagram is saved and survives a reload', async ({ page }) => {
    const name = 'spec-saved-diagram';
    await page.locator('#saveDiagramName').fill(name);
    await page.locator('#btnSaveDiagram').click();

    await expect(page.locator('#savedDiagramsList')).toContainText(name);

    // It must be in storage, not only in the DOM - the list is rendered from
    // localStorage on boot.
    await page.reload();
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });
    await openPalette(page, 'palette-game');
    await expect(page.locator('#savedDiagramsList')).toContainText(name);
  });
});
