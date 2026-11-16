import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Mark the boot as already seen for this tab, so the page loads straight to the panes. */
async function skipBoot(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('fs-booted', '1'));
}

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('#out')).toContainText('login ok.');
}

async function run(page: Page, command: string) {
  const input = page.getByLabel('friesentius@web:~$');
  await input.fill(command);
  await input.press('Enter');
}

/** Collect layout shifts that were not caused by user input. */
async function trackLayoutShift(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!e.hadRecentInput) w.__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const cls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);

test.describe('boot sequence', () => {
  test('plays on the first visit, is skippable, and not replayed in the same session', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/booting/);
    await expect(page.locator('#bootLog')).toContainText('loading neokeys');
    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveClass(/booting/);
    await expect(page.locator('#out')).toContainText('login ok.');

    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/booting/);
    await expect(page.locator('#boot')).toBeHidden();
  });

  test('finishes on its own and reveals the panes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/booting/);
    await expect(page.locator('html')).not.toHaveClass(/booting/, { timeout: 6000 });
    await expect(page.locator('#work')).toBeVisible();
  });

  const viewports = [
    { name: 'phone', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 900 },
  ];
  for (const vp of viewports) {
    for (const visit of ['first', 'repeat'] as const) {
      test(`causes no layout shift on a ${visit} visit (${vp.name})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        if (visit === 'repeat') await skipBoot(page);
        await trackLayoutShift(page);
        await page.goto('/');
        await expect(page.locator('html')).not.toHaveClass(/booting/, { timeout: 6000 });
        await expect(page.locator('#out')).toContainText('login ok.');
        // Let the tile-in animation, tagline typing and fonts settle.
        await page.waitForTimeout(1500);
        // Only the blinking cursor that follows the typed login may move.
        expect(await cls(page)).toBeLessThan(0.001);
      });
    }
  }
});

test.describe('command prompt', () => {
  test.beforeEach(async ({ page }) => {
    await skipBoot(page);
    await ready(page);
  });

  test('help, ls, whoami and unknown commands print output', async ({ page }) => {
    const out = page.locator('#out');
    await run(page, 'ls');
    await expect(out).toContainText('neokeys/');
    await expect(out).toContainText('matrix@');
    await run(page, 'whoami');
    await expect(out).toContainText(
      'friesentius, aka Tyler Friesen. Runs Matrix Automation Solutions.',
    );
    await run(page, 'frobnicate');
    await expect(out).toContainText('frobnicate: command not found');
    await run(page, 'clear');
    await expect(out).toBeEmpty();
    await run(page, 'help');
    await expect(out).toContainText('replay the boot');
  });

  test('open goes to the case study', async ({ page }) => {
    await run(page, 'open kanso');
    await expect(page.locator('#out')).toContainText('opening kanso');
    await expect(page).toHaveURL(/\/work\/kanso\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('kanso');
  });

  test('open tools goes to the internal tools write-up', async ({ page }) => {
    await run(page, 'open tools');
    await expect(page).toHaveURL(/\/work\/internal-tools\/?$/);
  });

  test('cv and work go to their pages', async ({ page }) => {
    await run(page, 'cv');
    await expect(page).toHaveURL(/\/cv\/?$/);
    await page.goBack();
    await run(page, 'work');
    await expect(page).toHaveURL(/\/work\/?$/);
  });

  test('contact and open matrix stay on the page and focus their panes', async ({ page }) => {
    await run(page, 'contact');
    await expect(page.locator('#contact')).toBeFocused();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.locator('#out a[href="https://matrixautomate.co"]')).toBeVisible();
    await page.getByLabel('friesentius@web:~$').focus();
    await run(page, 'open matrix');
    await expect(page.locator('#matrix')).toBeFocused();
  });

  test('theme and motion switch and persist', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const html = page.locator('html');
    await expect(page.locator('#themeBtn')).toHaveAccessibleName('theme:dark');
    await run(page, 'theme');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#out')).toContainText('theme: light');
    await run(page, 'motion');
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('#motionBtn')).toHaveAccessibleName('motion:off');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await run(page, 'reboot');
    await expect(page.locator('#out')).toContainText('reboot skipped: motion is off');
  });

  test('theme reveal uncovers the whole page through one circle', async ({ page }) => {
    // Every snapshot group in the view transition. A group other than root is
    // animated on its own and escapes the circle clip on the root.
    const groupsDuring = (selector: string) =>
      page.evaluate(async (sel) => {
        (document.querySelector(sel) as HTMLElement).click();
        for (let i = 0; i < 60; i++) {
          await new Promise(requestAnimationFrame);
          const groups = document
            .getAnimations()
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? '')
            .filter((p) => p.startsWith('::view-transition-group'));
          if (groups.length) return [...new Set(groups)].sort();
        }
        return [];
      }, selector);

    expect(await groupsDuring('#themeBtn')).toEqual(['::view-transition-group(root)']);
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
    await page.waitForTimeout(800);
    // The tile morph still gives each tile its own group.
    expect(await groupsDuring('#p-neokeys summary')).toContain(
      '::view-transition-group(t-neokeys)',
    );
  });

  test('reboot replays the boot sequence', async ({ page }) => {
    await run(page, 'reboot');
    await expect(page.locator('html')).toHaveClass(/booting/);
    await page.locator('#boot').click();
    await expect(page.locator('html')).not.toHaveClass(/booting/);
  });

  test('tab completes and arrows walk history', async ({ page }) => {
    const input = page.getByLabel('friesentius@web:~$');
    await input.fill('who');
    await input.press('Tab');
    await expect(input).toHaveValue('whoami ');
    await input.fill('open ne');
    await input.press('Tab');
    await expect(input).toHaveValue('open neokeys');
    await input.fill('');
    await run(page, 'ls');
    await run(page, 'whoami');
    await input.focus();
    await input.press('ArrowUp');
    await expect(input).toHaveValue('whoami');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('ls');
    await input.press('ArrowDown');
    await input.press('ArrowDown');
    await expect(input).toHaveValue('');
  });

  test('keys 0-3 switch workspaces: Contact in place, Work and CV as pages', async ({ page }) => {
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('3');
    await expect(page.locator('#contact')).toBeFocused();
    await page.keyboard.press('0');
    await expect(page.locator('#top')).toBeInViewport();
    await page.keyboard.press('2');
    await expect(page).toHaveURL(/\/cv\/?$/);
    await page.keyboard.press('1');
    await expect(page).toHaveURL(/\/work\/?$/);
    await page.keyboard.press('0');
    await expect(page).toHaveURL(/:\d+\/$/);
  });

  test('tiles link to their case studies', async ({ page }) => {
    const tile = page.locator('#p-tools');
    await tile.locator('summary').click();
    await tile.getByRole('link', { name: 'write-up ->' }).click();
    await expect(page).toHaveURL(/\/work\/internal-tools\/?$/);
  });

  test('tiles open and close by click', async ({ page }) => {
    const tile = page.locator('#p-neokeys');
    await tile.locator('summary').click();
    await expect(tile).toHaveAttribute('open', '');
    await expect(tile.getByRole('link', { name: 'repo ↗' })).toHaveAttribute(
      'href',
      'https://github.com/friesentius/obsidian-neokeys',
    );
    await tile.locator('summary').click();
    await expect(tile).not.toHaveAttribute('open');
  });
});

test.describe('phones', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('command chips are tappable', async ({ page }) => {
    await skipBoot(page);
    await ready(page);
    await page.getByRole('button', { name: 'ls', exact: true }).tap();
    await expect(page.locator('#out')).toContainText('kanso/');
    await page.getByRole('button', { name: 'open neokeys' }).tap();
    await expect(page).toHaveURL(/\/work\/neokeys\/?$/);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('skips the boot and runs no animations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/booting/);
    await expect(page.locator('#out')).toContainText('login ok.');
    await expect(page.locator('#motionBtn')).toHaveAccessibleName('motion:off (system)');
    // Hovering a tile would normally animate its drawing.
    await page.locator('#p-neokeys summary').hover();
    await page.waitForTimeout(300);
    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === 'running').length,
    );
    expect(running).toBe(0);
    // The full rotating-word list is shown as static text.
    await expect(page.locator('.rot .static')).toBeVisible();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every pane is readable and the prompt is hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/booting/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const id of ['work', 'matrix', 'cv', 'contact'])
      await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.locator('#term')).toBeHidden();
    await expect(page.locator('#boot')).toBeHidden();
    // Native <details> still expands.
    await page.locator('#p-potful summary').click();
    await expect(page.locator('#p-potful a[href="https://potful.io"]')).toBeVisible();
  });
});

test.describe('layout', () => {
  for (const width of [360, 390, 820, 1440]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await skipBoot(page);
      await ready(page);
      // An open tile spans the full row; it must still fit.
      await page.locator('#p-neokeys summary').click();
      await expect(page.locator('#p-neokeys')).toHaveAttribute('open', '');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });

    test(`scanline layer spans the whole page at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await skipBoot(page);
      await ready(page);
      // A viewport-sized (fixed) layer would end at the first screen and leave a
      // visible seam in the backdrop below it.
      const { layer, page: pageHeight } = await page.evaluate(() => ({
        layer: parseFloat(getComputedStyle(document.body, '::after').height),
        page: document.documentElement.scrollHeight,
      }));
      expect(pageHeight).toBeGreaterThan(900);
      // scrollHeight is rounded to whole pixels.
      expect(layer).toBeGreaterThan(pageHeight - 1);
    });

    test(`shell shows the welcome and help without cutting a line at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await skipBoot(page);
      await ready(page);
      const out = page.locator('#out');
      const fits = await out.evaluate((o) => o.scrollHeight <= o.clientHeight);
      expect(fits).toBe(true);
      await expect(out).not.toHaveClass(/more-below|more-above/);
    });
  }

  for (const width of [360, 390]) {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      test(`top bar keeps brand and toggles on one row at ${width}px (motion ${reducedMotion})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ reducedMotion });
        await skipBoot(page);
        await ready(page);
        const [brand, tools, nav] = await Promise.all(
          ['.brand', '.tools', '.bar nav'].map((s) =>
            page.locator(s).evaluate((el) => el.getBoundingClientRect().toJSON()),
          ),
        );
        // The toggles share the brand's row, and the workspace tabs sit below both.
        expect(tools.bottom).toBeLessThanOrEqual(nav.top);
        expect(
          Math.abs(tools.top + tools.height / 2 - (brand.top + brand.height / 2)),
        ).toBeLessThan(4);
      });
    }
  }

  test('long shell output fades at the edges that have more to scroll', async ({ page }) => {
    await skipBoot(page);
    await ready(page);
    const out = page.locator('#out');
    await run(page, 'help');
    await run(page, 'ls');
    // New output scrolls to the bottom: only the top edge has more.
    await expect(out).toHaveClass(/more-above/);
    await expect(out).not.toHaveClass(/more-below/);
    expect(await out.evaluate((o) => getComputedStyle(o).maskImage)).toContain('gradient');
    await out.evaluate((o) => o.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(out).toHaveClass(/more-below/);
    await expect(out).not.toHaveClass(/more-above/);
    await run(page, 'clear');
    await expect(out).not.toHaveClass(/more-below|more-above/);
  });

  test('keyboard focus ring on shell output stays whole while both edges fade', async ({
    page,
  }) => {
    await skipBoot(page);
    await ready(page);
    const out = page.locator('#out');
    await run(page, 'help');
    await run(page, 'ls');
    await out.evaluate((o) =>
      o.scrollTo({ top: (o.scrollHeight - o.clientHeight) / 2, behavior: 'instant' }),
    );
    await expect(out).toHaveClass(/more-above/);
    await expect(out).toHaveClass(/more-below/);
    await page.getByLabel('friesentius@web:~$').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(out).toBeFocused();
    expect(await out.evaluate((o) => o.matches(':focus-visible'))).toBe(true);
    const ring = await out.evaluate((o) => {
      const frame = o.parentElement!;
      const s = getComputedStyle(frame);
      return {
        mask: getComputedStyle(o).maskImage,
        frameMask: s.maskImage,
        color: s.outlineColor,
        width: parseFloat(s.outlineWidth),
        offset: parseFloat(s.outlineOffset),
        box: o.getBoundingClientRect().toJSON(),
      };
    });
    expect(ring.mask).toContain('gradient');
    expect(ring.frameMask).toBe('none');
    expect(ring.width).toBeGreaterThan(0);
    // Sample the ring's pixels on all four sides, including the two faded edges.
    const { box, width, offset } = ring;
    const inner = offset + width / 2;
    const strips = {
      top: { x: box.x + 8, y: box.y - inner - 0.5, width: box.width - 16, height: 1 },
      bottom: { x: box.x + 8, y: box.bottom + inner - 0.5, width: box.width - 16, height: 1 },
      left: { x: box.x - inner - 0.5, y: box.y + 8, width: 1, height: box.height - 16 },
      right: { x: box.right + inner - 0.5, y: box.y + 8, width: 1, height: box.height - 16 },
    };
    for (const [side, clip] of Object.entries(strips)) {
      const png = (await page.screenshot({ clip })).toString('base64');
      const share = await page.evaluate(
        async ({ png, color }) => {
          const [r, g, b] = color.match(/\d+/g)!.map(Number);
          const img = await createImageBitmap(
            await (await fetch(`data:image/png;base64,${png}`)).blob(),
          );
          const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const px = ctx.getImageData(0, 0, img.width, img.height).data;
          let hits = 0;
          for (let i = 0; i < px.length; i += 4) {
            const d = Math.abs(px[i] - r) + Math.abs(px[i + 1] - g) + Math.abs(px[i + 2] - b);
            if (d < 60) hits++;
          }
          return hits / (px.length / 4);
        },
        { png, color: ring.color },
      );
      expect(share, `ring visible on the ${side} edge`).toBeGreaterThan(0.9);
    }
  });
});

test.describe('accessibility', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`no axe violations in the ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await skipBoot(page);
      await ready(page);
      await run(page, 'contact');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([]);
    });
  }
});

test.describe('workspace highlight', () => {
  test.beforeEach(async ({ page }) => {
    await skipBoot(page);
    await ready(page);
  });

  /** Wait for scrolling to settle, then return the labels of every highlighted workspace. */
  async function highlighted(page: Page) {
    await page.waitForFunction(
      () =>
        new Promise<boolean>((resolve) => {
          const y = window.scrollY;
          setTimeout(() => resolve(window.scrollY === y), 300);
        }),
    );
    // A page tab gives way to a location tab (Contact) while that pane is active.
    return page
      .locator('.ws a[aria-current]')
      .evaluateAll((els) =>
        els
          .filter((el) => !el.matches('.ws:has([aria-current="location"]) [aria-current="page"]'))
          .map((el) => el.textContent?.replace(/\s+/g, '').replace(/^\d/, '')),
      );
  }

  test('the workspace tabs are real links', async ({ page }) => {
    const hrefs = await page
      .locator('.ws a')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs).toEqual(['/', '/work', '/cv', '/#contact']);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`Home is lit until the Contact pane is reached at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      expect(await highlighted(page)).toEqual(['Home']);
      await page.locator('body').click({ position: { x: 5, y: 300 } });
      await page.keyboard.press('3');
      await expect(page.locator('#contact')).toBeFocused();
      expect(await highlighted(page)).toEqual(['Contact']);
      await page.keyboard.press('0');
      expect(await highlighted(page)).toEqual(['Home']);
      await page.locator('.ws a[href="/#contact"]').click();
      await expect(page.locator('#contact')).toBeFocused();
      expect(await highlighted(page)).toEqual(['Contact']);
    });
  }

  test('follows the contact command', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await run(page, 'contact');
    expect(await highlighted(page)).toEqual(['Contact']);
  });
});
