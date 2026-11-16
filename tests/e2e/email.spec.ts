// The email reveal, against the build with the public Turnstile and Worker
// values set (playwright.config.ts). Turnstile and the Worker are stubbed:
// the real ones need the owner's Cloudflare account.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WORKER = 'https://email.example.test/';
const ADDRESS = 'someone@example.test';

/** A stand-in for Cloudflare's api.js that passes (or fails) the check when the widget renders. */
async function stubTurnstile(page: Page, outcome: 'pass' | 'error' = 'pass') {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile = {
        render(el, o) {
          el.setAttribute('data-stub', o.theme);
          el.textContent = 'stub check';
          setTimeout(() => ${outcome === 'pass' ? "o.callback('good-token')" : "o['error-callback']()"}, 50);
          return 'w1';
        },
        remove(id) {},
      };`,
    }),
  );
}

async function stubWorker(page: Page, status = 200) {
  const bodies: string[] = [];
  await page.route(WORKER, async (route) => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    bodies.push(req.postData() ?? '');
    return route.fulfill({
      status,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? { email: ADDRESS } : { error: 'verification failed' }),
    });
  });
  return bodies;
}

test.describe('show email', () => {
  test('the address is not in the page until it is asked for', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toContain(ADDRESS);
    expect(html).not.toContain('mailto:');
    await expect(
      page.locator('#contact').getByRole('button', { name: 'show email' }),
    ).toBeVisible();
    // Turnstile only loads on demand.
    expect(await page.locator('script[src*="challenges.cloudflare.com"]').count()).toBe(0);
  });

  test('passing the check reveals a mailto link and focuses it', async ({ page }) => {
    await stubTurnstile(page);
    const bodies = await stubWorker(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'show email' }).click();
    const link = page.locator('#contact a[href^="mailto:"]');
    await expect(link).toHaveAttribute('href', `mailto:${ADDRESS}`);
    await expect(link).toHaveText(ADDRESS);
    await expect(link).toBeFocused();
    expect(JSON.parse(bodies[0] ?? '{}')).toEqual({ token: 'good-token' });
    await expect(page.getByRole('button', { name: 'show email' })).toHaveCount(0);
  });

  test('works from the keyboard and on the CV page', async ({ page }) => {
    await stubTurnstile(page);
    await stubWorker(page);
    await page.goto('/cv');
    const btn = page.getByRole('button', { name: 'show email' });
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('a[href^="mailto:"]')).toHaveText(ADDRESS);
  });

  test('a refused request offers a retry, then succeeds', async ({ page }) => {
    await stubTurnstile(page);
    let calls = 0;
    await page.route(WORKER, (route) => {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
      if (route.request().method() === 'OPTIONS')
        return route.fulfill({ status: 204, headers: cors });
      calls += 1;
      return route.fulfill(
        calls === 1
          ? { status: 403, headers: cors, body: '{"error":"x"}' }
          : { status: 200, headers: cors, body: JSON.stringify({ email: ADDRESS }) },
      );
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'show email' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Could not get the address' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'try again' }).click();
    await expect(page.locator('a[href^="mailto:"]')).toHaveText(ADDRESS);
  });

  test('a failed check shows a status message, not a crash', async ({ page }) => {
    await stubTurnstile(page, 'error');
    await stubWorker(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'show email' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'The check failed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'try again' })).toBeEnabled();
  });

  test('the widget follows the light theme', async ({ page }) => {
    await stubTurnstile(page);
    await stubWorker(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.getByRole('button', { name: 'show email' }).click();
    await expect(page.locator('[data-stub]')).toHaveAttribute('data-stub', 'light');
  });

  test('in print, the CV points to the contact link until the address is revealed', async ({
    page,
  }) => {
    await stubTurnstile(page);
    await stubWorker(page);
    await page.goto('/cv');
    const slot = page.locator('#reach [data-email-slot]');
    const note = slot.getByText('via the contact link at https://friesentius.github.io/cv');
    await expect(note).toBeHidden();

    await page.emulateMedia({ media: 'print' });
    await expect(note).toBeVisible();
    await expect(slot.getByRole('button', { name: 'show email' })).toBeHidden();
    await expect(slot).not.toContainText(ADDRESS);

    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('button', { name: 'show email' }).click();
    await expect(slot.locator('a[href^="mailto:"]')).toHaveText(ADDRESS);

    await page.emulateMedia({ media: 'print' });
    await expect(slot.locator('a[href^="mailto:"]')).toBeVisible();
    await expect(slot).toHaveText(ADDRESS);
  });

  test('the home shell points at the pane control', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('fs-booted', '1'));
    await page.goto('/');
    await expect(page.locator('#out')).toContainText('login ok.');
    const input = page.getByLabel('friesentius@web:~$');
    await input.fill('contact');
    await input.press('Enter');
    await expect(page.locator('#out')).toContainText('use "show email" in the contact pane');
  });

  test('has no accessibility violations on the button or the widget state', async ({ page }) => {
    await stubTurnstile(page);
    await stubWorker(page);
    await page.goto('/cv');
    for (const scheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    }
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('points to the other contact links', async ({ page }) => {
    await page.goto('/');
    // Playwright's text selectors skip <noscript>, so match it by CSS.
    const note = page.locator('#contact noscript .email-note');
    await expect(note).toBeVisible();
    await expect(note).toHaveText('Needs JavaScript - use the links here instead.');
    await expect(page.getByRole('button', { name: 'show email' })).toBeHidden();
  });
});
