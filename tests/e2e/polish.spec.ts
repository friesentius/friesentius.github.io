import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Phase 3: the 404 page, search and share metadata, keyboard use, landmarks
// and the motion toggle, checked on every page.

const SITE = 'https://friesentius.github.io';
const MISSING = '/work/nope/deeper';

const PAGES = [
  '/',
  '/work',
  '/work/neokeys',
  '/work/kanso',
  '/work/potful',
  '/work/internal-tools',
  '/cv',
];

const meta = (page: Page, selector: string) =>
  page.locator(`head ${selector}`).first().getAttribute('content');

test.describe('404 page', () => {
  test('is served with a 404 status at any depth, in the shared chrome', async ({ page }) => {
    const response = await page.goto(MISSING);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle('Not found - Tyler Friesen');
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('404');
    // Assets are absolute, so the page is styled however deep the address is.
    await expect(page.locator('.pane').first()).toHaveCSS('border-top-style', 'solid');
    await expect(page.locator('#lostPath')).toHaveText(MISSING);
    await expect(page.locator('.ws a[aria-current]')).toHaveCount(0);
    for (const [name, href] of [
      ['cd ~', '/'],
      ['cd ~/work', '/work'],
      ['cat cv.txt', '/cv'],
    ])
      await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  });

  test('is kept out of search results and the sitemap', async ({ page, request }) => {
    await page.goto(MISSING);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('head meta[property="og:url"]')).toHaveCount(0);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('404');
  });

  test('its prompt works: ls lists the projects and cd .. goes home', async ({ page }) => {
    await page.goto(MISSING);
    const input = page.locator('#pIn');
    await input.fill('ls');
    await input.press('Enter');
    await expect(page.locator('#pOut').getByRole('link', { name: 'neokeys/' })).toHaveAttribute(
      'href',
      '/work/neokeys',
    );
    await page.getByRole('button', { name: 'work' }).click();
    await expect(page).toHaveURL(/\/work\/?$/);
    await page.goto(MISSING);
    await input.fill('cd ..');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/$/);
  });

  test('the search plays once and ends on its verdict', async ({ page }) => {
    await page.goto(MISSING);
    await expect(page.locator('.find-fill')).toHaveCSS('animation-name', 'find-fill');
    await expect(page.locator('.find-res')).toHaveText(/^0 matches in 7 pages$/);
    // Once finished, nothing in the search is still animating.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (a) =>
                  a.playState === 'running' &&
                  (a.effect as KeyframeEffect | null)?.target?.closest('.find'),
              ).length,
        ),
      )
      .toBe(0);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the search is already finished', async ({ page }) => {
      await page.goto(MISSING);
      await expect(page.locator('.find-fill')).toHaveCSS('animation-name', 'none');
      await expect(page.locator('.find-fill')).toHaveCSS('width', /^[1-9]/);
      await expect(page.locator('.find-res')).toBeVisible();
    });
  });
});

test.describe('search and share metadata', () => {
  for (const path of PAGES) {
    test(`${path} has a canonical URL that matches the sitemap and a social card`, async ({
      page,
      request,
    }) => {
      await page.goto(path);
      const canonical = `${SITE}${path === '/' ? '/' : `${path}/`}`;
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', canonical);
      expect(await meta(page, 'meta[property="og:url"]')).toBe(canonical);
      expect(await meta(page, 'meta[property="og:image"]')).toBe(`${SITE}/og.png`);
      expect(await meta(page, 'meta[name="twitter:image"]')).toBe(`${SITE}/og.png`);
      expect(await meta(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
      expect(await meta(page, 'meta[property="og:image:alt"]')).toBeTruthy();
      expect(await meta(page, 'meta[name="description"]')).toBeTruthy();
      expect(await meta(page, 'meta[property="og:title"]')).toBe(await page.title());
      const sitemap = await (await request.get('/sitemap-0.xml')).text();
      expect(sitemap).toContain(`<loc>${canonical}</loc>`);
    });
  }

  test('the social image is a 1200x630 PNG', async ({ request }) => {
    const response = await request.get('/og.png');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    // The committed file is what the build serves.
    expect(png.equals(await readFile('public/og.png'))).toBe(true);
  });

  test('robots.txt allows crawling and names the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.headers()['content-type']).toContain('text/plain');
    expect(await response.text()).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap-index.xml\n`,
    );
  });

  test('the sitemap lists every page once', async ({ request }) => {
    const index = await (await request.get('/sitemap-index.xml')).text();
    expect(index).toContain(`${SITE}/sitemap-0.xml`);
    const urls = [
      ...(await (await request.get('/sitemap-0.xml')).text()).matchAll(/<loc>(.*?)<\/loc>/g),
    ]
      .map((m) => m[1])
      .sort();
    expect(urls).toEqual(
      [
        '/',
        '/cv/',
        '/work/',
        '/work/internal-tools/',
        '/work/kanso/',
        '/work/neokeys/',
        '/work/potful/',
      ]
        .map((p) => `${SITE}${p}`)
        .sort(),
    );
  });

  test('the home page describes its owner as structured data', async ({ page }) => {
    await page.goto('/');
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json ?? '{}');
    expect(data).toMatchObject({ '@type': 'Person', name: 'Tyler Friesen', url: `${SITE}/` });
    expect(data.sameAs).toEqual(['https://github.com/friesentius']);
    expect(data.worksFor).toEqual({
      '@type': 'Organization',
      name: 'Matrix Automation Solutions',
      url: 'https://matrixautomate.co',
    });
  });
});

test.describe('structure and names', () => {
  for (const path of [...PAGES, MISSING]) {
    test(`${path} has landmarks, one h1, ordered headings and a working skip link`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
          .filter((h) => (h as HTMLElement).offsetParent !== null || h.getClientRects().length)
          .map((h) => Number(h.tagName[1])),
      );
      levels.reduce((prev, level) => {
        expect(level - prev).toBeLessThanOrEqual(1);
        return level;
      }, 0);
      // The skip link is the first stop, is shown when focused, and lands on <main>.
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: 'Skip to content' });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toBeFocused();
    });

    test(`${path} names its controls for screen readers`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('#themeBtn')).toHaveAccessibleName(/^theme:(dark|light)$/);
      await expect(page.locator('#motionBtn')).toHaveAccessibleName(/^motion:(on|off)/);
      const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll('a[href], button, summary, input, [role="button"]')]
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .filter((el) => {
            const label = el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby');
            const byFor = (el as HTMLInputElement).labels?.length;
            return !label && !byFor && !(el.textContent ?? '').trim();
          })
          .map((el) => el.outerHTML.slice(0, 80)),
      );
      expect(unnamed).toEqual([]);
    });
  }

  test('project tiles and cards are named after their project', async ({ page }) => {
    await page.goto('/');
    for (const name of ['neokeys/', 'kanso/', 'potful/', 'tools/'])
      await expect(page.locator('summary', { hasText: name })).toBeVisible();
    await page.goto('/work');
    await expect(page.getByRole('group', { name: 'Filter projects by type' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'all' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('keyboard', () => {
  for (const scheme of ['dark', 'light'] as const) {
    for (const path of [...PAGES, MISSING]) {
      test(`${path} in the ${scheme} theme: every stop shows a focus ring and clears the top bar`, async ({
        page,
      }) => {
        // Reduced motion makes scrolling instant, so each stop is measured settled.
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(path);
        const first = await page.evaluate(() => document.activeElement?.tagName);
        expect(first).toBe('BODY');
        const seen = new Set<string>();
        for (let i = 0; i < 80; i++) {
          await page.keyboard.press('Tab');
          const stop = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            if (!el || el === document.body) return null;
            const ringOf = (e: Element) => {
              const c = getComputedStyle(e);
              return (
                (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) ||
                c.boxShadow !== 'none'
              );
            };
            // A focus ring may sit on the control or on the frame that draws it.
            const frame = el.closest('.out-frame, .tile, .wcard, summary');
            // The dial's keys draw their ring as a thick accent stroke on the wedge.
            const wedge = el.querySelector('.wedge');
            const dialRing = !!wedge && parseFloat(getComputedStyle(wedge).strokeWidth) >= 3;
            const rect = el.getBoundingClientRect();
            const bar = document.querySelector('.bar')!.getBoundingClientRect();
            // The skip link is drawn above the bar on purpose.
            const inBar = !!el.closest('.bar, .skip');
            const tag = el instanceof SVGElement ? 'svg' : el.tagName.toLowerCase();
            return {
              id: `${tag}:${(el.getAttribute('aria-label') ?? el.textContent ?? el.id).trim().slice(0, 30)}`,
              ring: ringOf(el) || (!!frame && ringOf(frame)) || dialRing,
              visible: rect.width > 0 && rect.height > 0,
              inView: rect.bottom > 0 && rect.top < innerHeight,
              hidden: !inBar && rect.top < bar.bottom - 1 && rect.bottom > bar.top,
            };
          });
          if (!stop || seen.has(stop.id)) break;
          seen.add(stop.id);
          expect(stop, stop.id).toMatchObject({
            ring: true,
            visible: true,
            inView: true,
            hidden: false,
          });
        }
        expect(seen.size).toBeGreaterThan(10);
      });
    }
  }

  test('the prompt input has a visible ring of its own', async ({ page }) => {
    await page.goto('/work');
    await page.locator('#pIn').focus();
    await expect(page.locator('#pIn')).toHaveCSS('outline-style', 'solid');
    await page.goto('/');
    await page.locator('#cmd').focus();
    await expect(page.locator('#cmd')).toHaveCSS('outline-style', 'solid');
  });
});

test.describe('the on-page motion toggle', () => {
  // The OS setting is left alone here: the page's own toggle must stop
  // everything on every page, including what a hover would start.
  for (const path of [...PAGES, MISSING]) {
    test(`${path} stops every animation and smooth scroll`, async ({ page }) => {
      await page.addInitScript(() => {
        sessionStorage.setItem('fs-booted', '1');
        (window as unknown as { raf: number }).raf = 0;
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => {
          (window as unknown as { raf: number }).raf += 1;
          return raf(cb);
        };
      });
      await page.goto(path);
      await expect(page.locator('#motionBtn')).toHaveAttribute('title', /./);
      await page.locator('#motionBtn').click();
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      // Hover what would animate, where the page has such a thing.
      const hoverable = page.locator('summary, .wcard, .illus .key').first();
      if (await hoverable.count()) await hoverable.hover();
      await page.evaluate(() => {
        (window as unknown as { raf: number }).raf = 0;
      });
      await page.waitForTimeout(600);
      const state = await page.evaluate(() => ({
        running: document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map((a) => (a as CSSAnimation).animationName ?? a.id),
        scroll: getComputedStyle(document.documentElement).scrollBehavior,
        raf: (window as unknown as { raf: number }).raf,
      }));
      expect(state.running).toEqual([]);
      expect(state.scroll).toBe('auto');
      expect(state.raf).toBe(0);
    });
  }
});
