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

const LIVE = 'https://codeonline.io/ace';
const SHARE_TOKEN = process.env.ACE_SHARE_TOKEN || 'L5XDc1JXFI8xogw6OeiYHdz4';

function blockingViolations(results: import('axe-core').AxeResults) {
  return results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  );
}

test.describe('Accessibility - additional surfaces', () => {
  test('mobile editor has no serious or critical axe violations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = blockingViolations(results);
    expect(blocking, blocking.map(v => `${v.id}: ${v.help} (${v.nodes.length})`).join('\n')).toEqual([]);
  });

  test('public share page has no serious or critical axe violations', async ({ page, request }) => {
    const shared = await request.get(`${LIVE}/s/${SHARE_TOKEN}`);
    test.skip(!shared.ok(), `Share token ${SHARE_TOKEN} is unavailable; set ACE_SHARE_TOKEN`);

    await page.goto(`${LIVE}/s/${SHARE_TOKEN}`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = blockingViolations(results);
    expect(blocking, blocking.map(v => `${v.id}: ${v.help} (${v.nodes.length})`).join('\n')).toEqual([]);
  });

  test('authenticated Library has no serious or critical axe violations', async ({ page }) => {
    await page.route('**/ace/api/me', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: { name: 'Axe User', email: 'axe@example.com', avatar: '' },
        csrfToken: 'axe',
      }),
    }));
    await page.route('**/ace/api/diagrams', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    }));

    await page.goto('/');
    await expect(page.locator('#aceUser')).not.toHaveAttribute('hidden', '', { timeout: 10000 });
    await page.locator('#palette-save .palette-btn.minimize').click();
    await expect(page.locator('#aceCloud')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = blockingViolations(results);
    expect(blocking, blocking.map(v => `${v.id}: ${v.help} (${v.nodes.length})`).join('\n')).toEqual([]);
  });
});
