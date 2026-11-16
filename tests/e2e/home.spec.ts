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
      'friesentius, aka [Full name]. Runs Matrix Automation Solutions.',
    );
    await run(page, 'frobnicate');
    await expect(out).toContainText('frobnicate: command not found');
    await run(page, 'clear');
    await expect(out).toBeEmpty();
    await run(page, 'help');
    await expect(out).toContainText('replay the boot');
  });

  test('open expands a project tile and moves to it', async ({ page }) => {
    await run(page, 'open kanso');
    await expect(page.locator('#p-kanso')).toHaveAttribute('open', '');
    await expect(page.locator('#p-kanso')).toBeInViewport();
    await expect(page.locator('#work')).toBeFocused();
  });

  test('cv and contact jump to their panes; contact links the company', async ({ page }) => {
    await run(page, 'cv');
    await expect(page.locator('#cv')).toBeFocused();
    await page.getByLabel('friesentius@web:~$').focus();
    await run(page, 'contact');
    await expect(page.locator('#contact')).toBeFocused();
    await expect(page.locator('#out a[href="https://matrixautomate.co"]')).toBeVisible();
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
    await run(page, 'cv');
    await input.focus();
    await input.press('ArrowUp');
    await expect(input).toHaveValue('cv');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('ls');
    await input.press('ArrowDown');
    await input.press('ArrowDown');
    await expect(input).toHaveValue('');
  });

  test('keys 1-3 jump between workspaces', async ({ page }) => {
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('2');
    await expect(page.locator('#cv')).toBeFocused();
    await page.keyboard.press('3');
    await expect(page.locator('#contact')).toBeFocused();
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
    await expect(page.locator('#p-neokeys')).toHaveAttribute('open', '');
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
      await run(page, 'open neokeys');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }
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
