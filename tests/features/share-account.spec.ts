import { test, expect } from '@playwright/test';

/**
 * Backend-facing high-risk flows: the public share page/OG image and the
 * Library/account states. The app runs locally for the panel test; the share
 * and account assertions intentionally hit the deployed site because the
 * Django backend is only mounted there.
 */

const LIVE = 'https://codeonline.io/ace';
const SHARE_TOKEN = process.env.ACE_SHARE_TOKEN || 'L5XDc1JXFI8xogw6OeiYHdz4';

test.use({ screenshot: 'on' });

test.describe('Share and account surfaces', () => {
  test('share page exposes an OG preview and PNG image', async ({ request }) => {
    const pageRes = await request.get(`${LIVE}/s/${SHARE_TOKEN}`);
    test.skip(!pageRes.ok(), `Share token ${SHARE_TOKEN} is unavailable; set ACE_SHARE_TOKEN`);
    expect(pageRes.ok()).toBeTruthy();

    const html = await pageRes.text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain(`/s/${SHARE_TOKEN}/image.png`);

    const image = await request.get(`${LIVE}/s/${SHARE_TOKEN}/image.png`);
    expect(image.ok()).toBeTruthy();
    expect(image.headers()['content-type']).toContain('image/png');
  });

  test('anonymous share opens Library with sign-in', async ({ page, request }) => {
    const me = await request.get(`${LIVE}/api/me`);
    expect(me.ok()).toBeTruthy();
    expect((await me.json()).authenticated).toBe(false);

    const shared = await request.get(`${LIVE}/s/${SHARE_TOKEN}`);
    test.skip(!shared.ok(), `Share token ${SHARE_TOKEN} is unavailable; set ACE_SHARE_TOKEN`);

    await page.goto(`${LIVE}/?d=${SHARE_TOKEN}`);

    await expect(page.locator('#aceSharedBanner')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#palette-save')).not.toHaveClass(/minimized/);
    await expect(page.locator('#aceGuest')).toBeVisible();
    await expect(page.locator('.ace-auth-btn.google')).toHaveAttribute(
      'href',
      /accounts\/google\/login/,
    );

    await page.screenshot({ path: 'test-results/share-anonymous.png' });
  });

  test('authenticated share keeps Library minimized', async ({ page, request }) => {
    const shared = await request.get(`${LIVE}/s/${SHARE_TOKEN}`);
    test.skip(!shared.ok(), `Share token ${SHARE_TOKEN} is unavailable; set ACE_SHARE_TOKEN`);

    await page.route('**/ace/api/me', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: { name: 'Spec User', email: 'spec@example.com', avatar: '' },
        csrfToken: 'spec',
      }),
    }));
    await page.route('**/ace/api/diagrams', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    }));

    await page.goto(`${LIVE}/?d=${SHARE_TOKEN}`);

    // The signed-in user must be applied, but the Library is deliberately
    // minimized, so its body (and #aceUser) is not visible.
    await expect(page.locator('#aceUser')).not.toHaveAttribute('hidden', '', { timeout: 10000 });
    await expect(page.locator('#palette-save')).toHaveClass(/minimized/);

    await page.screenshot({ path: 'test-results/share-authenticated.png' });
  });

  test('panels toggle reveals the BR pocket for a real click', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ball-cue')).toHaveClass(/on-table/, { timeout: 15000 });

    await page.locator('#panelsToggle').click();
    await expect(page.locator('body')).toHaveClass(/panels-hidden/);

    await page.evaluate(() => {
      // @ts-ignore - app debug API
      window.DEBUG.selectBall('1');
    });

    const br = page.locator('.pocket-target[data-pocket="corner-br"]');
    await br.dispatchEvent('click');

    await expect.poll(async () => page.evaluate(() => {
      // @ts-ignore - app debug API
      return window.DEBUG.state().selectedPocket;
    })).toBe('corner-br');

    await expect.poll(async () => page.evaluate(() => {
      // @ts-ignore - app debug API
      return window.DEBUG.state().aimReady;
    })).toBe(true);

    await page.screenshot({ path: 'test-results/panels-hidden-pocket.png' });

    await page.locator('#panelsToggle').click();
    await expect(page.locator('body')).not.toHaveClass(/panels-hidden/);
  });
});
