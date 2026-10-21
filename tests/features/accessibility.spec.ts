import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility audit of the core editor. Serious/critical WCAG A/AA
 * violations are treated as regressions; minor/moderate findings remain
 * visible in the report without blocking.
 */

test.use({ screenshot: 'on' });

test.describe('Accessibility', () => {
  test('core editor has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(
      blocking,
      blocking.map(v => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n')
    ).toEqual([]);
  });
});
