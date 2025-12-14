import { test, expect } from '@playwright/test';

// Mobile viewport tests
test.describe('Mobile Responsiveness', () => {

    test.beforeEach(async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12

        await page.addInitScript(() => {
            localStorage.setItem('ace-tour-completed', 'true');
        });
        await page.goto('/');
        await page.waitForTimeout(500);
    });

    test('should display table on mobile viewport', async ({ page }) => {
        // Table should be visible
        const table = page.locator('#pool-table-svg');
        await expect(table).toBeVisible();

        // Table should fit within viewport
        const tableBox = await table.boundingBox();
        const viewport = page.viewportSize();
        expect(tableBox!.width).toBeLessThanOrEqual(viewport!.width);
    });

    test('should have accessible cue controls', async ({ page }) => {
        // Cue palette should be visible at bottom
        const cuePalette = page.locator('#palette-cue');
        await expect(cuePalette).toBeVisible();

        // Shoot button should be tappable
        const shootBtn = page.locator('#btnShoot');
        await expect(shootBtn).toBeVisible();

        const btnBox = await shootBtn.boundingBox();
        // Touch target should be reasonable size
        expect(btnBox!.height).toBeGreaterThanOrEqual(30);
    });

    test('should have working ball palette', async ({ page }) => {
        // Ball palette should be visible
        const ballPalette = page.locator('#palette-balls');
        await expect(ballPalette).toBeVisible();

        // Should show balls
        const balls = page.locator('#palette-balls .ball');
        const count = await balls.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should execute shot on mobile', async ({ page }) => {
        // Click shoot button
        await page.locator('#btnShoot').click();

        // Wait for animation
        await page.waitForTimeout(3000);

        // Should show toast
        const toast = page.locator('#toastNotification');
        const toastText = await toast.textContent();

        // Should have some result
        expect(toastText).toBeTruthy();
    });
});

// Tablet viewport tests
test.describe('Tablet Responsiveness', () => {

    test.beforeEach(async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 810, height: 1080 }); // iPad-ish

        await page.addInitScript(() => {
            localStorage.setItem('ace-tour-completed', 'true');
        });
        await page.goto('/');
        await page.waitForTimeout(500);
    });

    test('should display all palettes on tablet', async ({ page }) => {
        // All main palettes should be visible
        await expect(page.locator('#palette-balls')).toBeVisible();
        await expect(page.locator('#palette-cue')).toBeVisible();
        await expect(page.locator('#palette-actions')).toBeVisible();
    });

    test('should fit table within tablet viewport', async ({ page }) => {
        const table = page.locator('#pool-table-svg');
        await expect(table).toBeVisible();

        const tableBox = await table.boundingBox();
        const viewport = page.viewportSize();
        expect(tableBox!.width).toBeLessThanOrEqual(viewport!.width);
    });
});
