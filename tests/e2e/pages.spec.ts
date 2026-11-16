import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The pages beyond home: the Work index, the four case studies and the CV.

const MISSING = '/work/nope/deeper';

const PAGES = [
  { path: '/work', h1: 'work/' },
  { path: '/work/neokeys', h1: 'neokeys' },
  { path: '/work/kanso', h1: 'kanso' },
  { path: '/work/potful', h1: 'potful' },
  { path: '/work/internal-tools', h1: 'internal tools' },
  { path: '/cv', h1: 'Tyler Friesen' },
  // Served for any address that does not exist; GitHub Pages does the same.
  { path: MISSING, h1: '404' },
];

/**
 * Wait for a navigation to land and the new page's script to run (it titles
 * the motion button), so the next key press or command is not lost.
 */
async function at(page: Page, url: RegExp) {
  await expect(page).toHaveURL(url);
  await expect(page.locator('#motionBtn')).toHaveAttribute('title', /./);
}

async function run(page: Page, command: string) {
  const input = page.locator('#pIn');
  await input.fill(command);
  await input.press('Enter');
}

test.describe('every page', () => {
  for (const { path, h1 } of PAGES) {
    test(`${path} renders with the shared chrome and no console errors`, async ({ page }) => {
      const errors: string[] = [];
      const notOk: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => {
        if (!r.ok()) notOk.push(new URL(r.url()).pathname);
      });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(h1);
      await expect(page.locator('#themeBtn')).toBeVisible();
      await expect(page.locator('#pIn')).toBeVisible();
      await expect(page).toHaveTitle(/ - Tyler Friesen$/);
      if (path === MISSING) {
        // The browser logs the missing document itself; nothing else may be missing.
        expect(notOk).toEqual([path]);
        expect(errors.filter((e) => !e.includes('404'))).toEqual([]);
      } else {
        expect(errors).toEqual([]);
      }
    });

    for (const width of [360, 390, 820, 1440]) {
      test(`${path} has no horizontal scroll at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBe(0);
      });
    }

    for (const scheme of ['dark', 'light'] as const) {
      test(`${path} has no axe violations in the ${scheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
        ).toEqual([]);
      });
    }
  }

  test('the top bar marks the current page and keys 0-3 switch pages', async ({ page }) => {
    await page.goto('/work/kanso');
    await expect(page.locator('.ws a[aria-current="page"]')).toHaveAttribute('href', '/work');
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('2');
    await at(page, /\/cv\/?$/);
    await expect(page.locator('.ws a[aria-current="page"]')).toHaveAttribute('href', '/cv');
    await page.keyboard.press('3');
    await at(page, /\/#contact$/);
    await expect(page.locator('#contact')).toBeInViewport();
    await expect(page.locator('.ws a[aria-current="location"]')).toHaveAttribute(
      'href',
      '/#contact',
    );
  });

  test('theme and motion choices carry across pages', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/work');
    await page.locator('#themeBtn').click();
    await page.locator('#motionBtn').click();
    await page.goto('/cv');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('#motionBtn')).toHaveAccessibleName('motion:off');
  });
});

test.describe('prompt', () => {
  test('help and ls print one line; ls links the case studies', async ({ page }) => {
    await page.goto('/work');
    const out = page.locator('#pOut');
    await run(page, 'help');
    await expect(out).toContainText('commands: help ls open <name> home work cv contact');
    await run(page, 'ls');
    await expect(out.getByRole('link', { name: 'potful/' })).toHaveAttribute(
      'href',
      '/work/potful',
    );
    await run(page, 'reboot');
    await expect(out).toHaveText('reboot: command not found. try help');
  });

  test('open, cd and the chips navigate', async ({ page }) => {
    await page.goto('/cv');
    await run(page, 'open potful');
    await at(page, /\/work\/potful\/?$/);
    await run(page, 'cd ..');
    await at(page, /\/work\/?$/);
    await run(page, 'cd ..');
    await at(page, /\/$/);
    await page.goto('/cv');
    await run(page, 'cd ..');
    await at(page, /\/$/);
    await page.goto('/work');
    await run(page, 'open internal-tools');
    await at(page, /\/work\/internal-tools\/?$/);
    await page.goto('/work');
    await page.getByRole('button', { name: 'open neokeys' }).click();
    await at(page, /\/work\/neokeys\/?$/);
    await run(page, 'contact');
    await at(page, /\/#contact$/);
  });

  test('tab completes and theme toggles from the prompt', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/work');
    const input = page.locator('#pIn');
    await input.fill('open ka');
    await input.press('Tab');
    await expect(input).toHaveValue('open kanso');
    await input.fill('');
    await run(page, 'theme');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#pOut')).toHaveText('theme: light');
  });
});

test.describe('work index', () => {
  test('filter chips narrow the list and update the ls line', async ({ page }) => {
    await page.goto('/work');
    const cards = page.locator('.wcard');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('#lsCount')).toHaveText('4 entries');
    await page.getByRole('button', { name: 'web app' }).click();
    await expect(page.getByRole('button', { name: 'web app' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(cards.locator('visible=true')).toHaveCount(1);
    await expect(page.locator('#w-potful')).toBeVisible();
    await expect(page.locator('#lsCmd')).toHaveText('ls ~/work --type=web-app');
    await expect(page.locator('#lsCount')).toHaveText('1 entry');
    await page.getByRole('button', { name: 'plugin' }).click();
    await expect(page.locator('#w-neokeys')).toBeVisible();
    await expect(page.locator('#w-potful')).toBeHidden();
    await page.getByRole('button', { name: 'all' }).click();
    await expect(cards.locator('visible=true')).toHaveCount(4);
    await expect(page.locator('#lsCmd')).toHaveText('ls ~/work');
  });

  test('cards link to their case studies, repos and sites', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('link', { name: 'Neokeys case study' })).toHaveAttribute(
      'href',
      '/work/neokeys',
    );
    await expect(page.getByRole('link', { name: 'Internal tools write-up' })).toHaveAttribute(
      'href',
      '/work/internal-tools',
    );
    await expect(page.getByRole('link', { name: 'Kanso repo on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/friesentius/obsidian-kanso',
    );
    await expect(page.locator('#w-potful a[href="https://potful.io"]')).toBeVisible();
  });
});

test.describe('case studies', () => {
  test('prev and next wrap around the project order', async ({ page }) => {
    await page.goto('/work/neokeys');
    const pager = page.getByRole('navigation', { name: 'Other projects' });
    await expect(pager.locator('a').first()).toHaveAttribute('href', '/work/internal-tools');
    await expect(pager.locator('a').last()).toHaveAttribute('href', '/work/kanso');
    await page.goto('/work/internal-tools');
    await expect(pager.locator('a').last()).toHaveAttribute('href', '/work/neokeys');
  });

  test('facts and narrative are written, with real screenshots', async ({ page, request }) => {
    for (const [path, shots] of [
      ['/work/neokeys', 3],
      ['/work/kanso', 2],
      ['/work/potful', 3],
    ] as const) {
      await page.goto(path);
      await expect(page.locator('main .ph')).toHaveCount(0);
      await expect(page.locator('#meta')).toContainText('2026');
      const imgs = page.locator('#screenshots .shot.real img');
      await expect(imgs).toHaveCount(shots);
      for (const img of await imgs.all()) {
        await expect(img).toHaveAttribute('alt', /\S{3,}.{40,}/);
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty('complete', true);
        expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
      }
      // Each frame links to its full-size image.
      for (const href of await page
        .locator('#screenshots a.shot')
        .evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
        const res = await request.get(href);
        expect(res.status()).toBe(200);
        expect(res.headers()['content-type']).toBe('image/webp');
      }
    }
    const meta = page.locator('#meta');
    await page.goto('/work/neokeys');
    await expect(meta).toContainText('Obsidian plugin');
    await expect(meta).toContainText('MIT');
    await expect(meta.getByRole('link', { name: 'Obsidian community plugins' })).toHaveAttribute(
      'href',
      'https://community.obsidian.md/plugins/neokeys',
    );
  });

  test('the sticky top bar stays above the screenshots as they scroll under it', async ({
    page,
  }) => {
    await page.goto('/work/kanso');
    const shot = page.locator('#screenshots .shot.real').first();
    await shot.scrollIntoViewIfNeeded();
    const bar = await page.locator('.bar').boundingBox();
    const box = await shot.boundingBox();
    await page.evaluate((dy) => window.scrollBy(0, dy), box!.y - bar!.y - 4);
    const x = (await shot.boundingBox())!.x + 20;
    const y = bar!.y + bar!.height / 2;
    expect(
      await page.evaluate(
        ([px, py]) =>
          document.elementFromPoint(px, py)?.closest('.bar, #screenshots')?.className ?? null,
        [x, y],
      ),
    ).toContain('bar');
    expect(
      await page.evaluate(
        ([px, py]) => document.elementFromPoint(px, py)?.closest('#screenshots') !== null,
        [x, bar!.y + bar!.height + 10],
      ),
    ).toBe(true);
  });

  test('internal tools keeps its narrative and screenshots as placeholders', async ({ page }) => {
    await page.goto('/work/internal-tools');
    for (const id of ['problem', 'approach', 'result'])
      await expect(page.locator(`#${id} .ph`).first()).toBeVisible();
    await expect(page.locator('#screenshots img')).toHaveCount(0);
    await expect(page.locator('#screenshots .shot .ph')).toHaveCount(2);
    await expect(page.locator('#screenshots')).toContainText('frames are placeholders');
  });

  test('only Neokeys has the dial, labelled as an illustration', async ({ page }) => {
    await page.goto('/work/neokeys');
    await expect(page.locator('#dial')).toContainText('Illustrative drawing, not a screenshot');
    for (const path of ['/work/kanso', '/work/potful', '/work/internal-tools']) {
      await page.goto(path);
      await expect(page.locator('#dial')).toHaveCount(0);
    }
  });

  test('the dial answers taps and the keyboard', async ({ page }) => {
    await page.goto('/work/neokeys');
    await page.getByRole('button', { name: 'key d' }).click();
    await expect(page.locator('#dialCap')).toHaveText(
      'leader, then d runs the command bound to it',
    );
    await page.getByRole('button', { name: 'key j' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#dialCap')).toContainText('then j runs');
  });

  test('Potful states no repo or licence (its source is private)', async ({ page }) => {
    await page.goto('/work/potful');
    await expect(page.locator('#meta')).not.toContainText('licence');
    await expect(page.locator('#meta')).not.toContainText('repo');
    await expect(page.locator('a[href*="github.com/friesentius/potful"]')).toHaveCount(0);
  });
});

test.describe('cv', () => {
  test('states the roles, skills and education, with no placeholders left', async ({ page }) => {
    await page.goto('/cv');
    await expect(page.locator('main .ph')).toHaveCount(0);
    await expect(page.locator('#reach')).toContainText('Ontario, Canada');
    const roles = page.locator('#experience .glog > li');
    await expect(roles).toHaveCount(2);
    await expect(roles.nth(0)).toContainText('IT Manager at Universal Fabricating Inc');
    await expect(roles.nth(0)).toContainText('Jun 2022 - present');
    await expect(roles.nth(0).locator('ul > li')).toHaveCount(8);
    await expect(roles.nth(1)).toContainText(
      'Information Technology Technician at Universal Fabricating Inc',
    );
    await expect(roles.nth(1)).toContainText('Nov 2019 - Jul 2022');
    // Listed by title and dates only.
    await expect(roles.nth(1).locator('ul')).toHaveCount(0);
    await expect(page.locator('#skills .tagc')).toHaveCount(12);
    await expect(page.locator('#skills h3')).toHaveText([
      'software',
      'automation',
      'infrastructure',
      'leadership',
    ]);
    await expect(page.locator('#education')).toContainText(
      'Bachelor of Computer Science, University of Windsor, 2021',
    );
    // No certifications: the section is gone, not left empty.
    await expect(page.locator('main')).not.toContainText('certification');
    // Until the Turnstile and Worker values are set, the email row says so.
    await expect(page.locator('[data-email-slot]')).toHaveText('email coming soon');
    await expect(page.getByRole('button', { name: 'show email' })).toHaveCount(0);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test('the CV downloads as a PDF printed from this page', async ({ page, request }) => {
    await page.goto('/cv');
    const link = page.getByRole('link', { name: 'download CV (PDF)' });
    await expect(link).toHaveAttribute('href', '/tyler-friesen-cv.pdf');
    await expect(link).toHaveAttribute('download', '');
    const res = await request.get('/tyler-friesen-cv.pdf');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
    const pdf = (await res.body()).toString('latin1');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('/Title (CV - Tyler Friesen)');
    // Links point at the live site and profiles, never at the build machine,
    // and there is no email address to link to.
    expect(pdf).toContain('/URI (https://github.com/friesentius)');
    expect(pdf).not.toMatch(/127\.0\.0\.1|localhost|mailto:/);
  });

  test('the print button opens the print dialog', async ({ page }) => {
    await page.goto('/cv');
    await page.evaluate(() => {
      (window as unknown as { printed: boolean }).printed = false;
      window.print = () => {
        (window as unknown as { printed: boolean }).printed = true;
      };
    });
    await page.getByRole('button', { name: 'print this page' }).click();
    expect(await page.evaluate(() => (window as unknown as { printed: boolean }).printed)).toBe(
      true,
    );
  });

  test('prints black on white with no chrome, glow or animation', async ({ page }) => {
    // Worst case for print: dark theme stored and motion on.
    await page.addInitScript(() => localStorage.setItem('fs-theme', 'dark'));
    await page.goto('/cv');
    // Start a scramble so the print happens mid-decode, the worst case.
    await page.locator('.page-h1').hover();
    await page.emulateMedia({ media: 'print' });
    const styles = await page.evaluate(() => {
      const css = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el) : null;
      };
      return {
        bg: getComputedStyle(document.body).backgroundColor,
        fg: getComputedStyle(document.body).color,
        bar: css('.bar')?.display,
        prompt: css('.p-prompt')?.display,
        footer: css('.site-foot')?.display,
        cta: css('.cv-hero .cta')?.display,
        scan: getComputedStyle(document.body, '::after').display,
        h1Shadow: css('.page-h1')?.textShadow,
        h1: (document.querySelector('.page-h1') as HTMLElement).innerText,
        running: document.getAnimations().filter((a) => a.playState === 'running').length,
        hidden: Array.from(document.querySelectorAll('.pane, .rv')).filter(
          (el) => getComputedStyle(el).opacity !== '1',
        ).length,
      };
    });
    expect(styles).toEqual({
      bg: 'rgb(255, 255, 255)',
      fg: 'rgb(0, 0, 0)',
      bar: 'none',
      prompt: 'none',
      footer: 'none',
      cta: 'none',
      scan: 'none',
      h1Shadow: 'none',
      h1: 'Tyler Friesen',
      running: 0,
      hidden: 0,
    });
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(10_000);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of ['/work', '/work/neokeys', '/cv']) {
    test(`${path} runs no animations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('#motionBtn')).toHaveAccessibleName('motion:off (system)');
      await page.locator('.wcard, .illus, .glog').first().hover();
      await page.waitForTimeout(300);
      const running = await page.evaluate(
        () => document.getAnimations().filter((a) => a.playState === 'running').length,
      );
      expect(running).toBe(0);
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the Work index shows every project and hides the controls', async ({ page }) => {
    await page.goto('/work');
    await expect(page.locator('.wcard')).toHaveCount(4);
    for (const card of await page.locator('.wcard').all()) await expect(card).toBeVisible();
    await expect(page.locator('.filters')).toBeHidden();
    await expect(page.locator('.p-prompt')).toBeHidden();
    await expect(page.locator('#lsCount')).toHaveText('4 entries');
  });

  test('case studies and the CV read in full', async ({ page }) => {
    await page.goto('/work/neokeys');
    for (const id of ['meta', 'problem', 'approach', 'dial', 'screenshots', 'stack', 'result'])
      await expect(page.locator(`#${id}`)).toBeVisible();
    await page.goto('/cv');
    await expect(page.locator('#experience')).toBeVisible();
    await expect(page.locator('#printBtn')).toBeHidden();
  });
});
