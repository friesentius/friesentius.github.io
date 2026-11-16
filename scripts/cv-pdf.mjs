// Astro integration: after every build, prints the built /cv page to a PDF
// next to it, so the downloadable CV is always the web CV's own print layout
// (the print rules at the end of src/styles/global.css) and never drifts from
// it. It needs Playwright's Chromium (`npx playwright install chromium`); a
// build without it fails rather than shipping a broken download link.
//
// The page is loaded under the real site origin, with every request answered
// from the build output, so links in the PDF point at the live site and no
// request leaves the machine.

import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

/**
 * @param {{ page: string, out: string }} options `page` is the path to print
 *   (e.g. `/cv/`), `out` the PDF's path in the build output (e.g. `/cv.pdf`).
 * @returns {import('astro').AstroIntegration}
 */
export default function cvPdf({ page: pagePath, out }) {
  /** @type {URL} */
  let site;
  return {
    name: 'cv-pdf',
    hooks: {
      'astro:config:done': ({ config }) => {
        if (!config.site) throw new Error('cv-pdf needs `site` set in astro.config.mjs');
        site = new URL(config.site);
      },
      'astro:build:done': async ({ dir, logger }) => {
        const root = resolve(fileURLToPath(dir));
        const browser = await chromium.launch();
        try {
          const context = await browser.newContext({ reducedMotion: 'reduce' });
          await context.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.origin !== site.origin) return route.abort();
            let file = resolve(join(root, decodeURIComponent(url.pathname)));
            if (file !== root && !file.startsWith(root + sep)) return route.abort();
            if (url.pathname.endsWith('/')) file = join(file, 'index.html');
            try {
              const body = await readFile(file);
              return route.fulfill({
                body,
                contentType: TYPES[extname(file)] ?? 'application/octet-stream',
              });
            } catch {
              return route.fulfill({ status: 404 });
            }
          });
          const page = await context.newPage();
          const res = await page.goto(new URL(pagePath, site).href, { waitUntil: 'load' });
          if (!res?.ok()) throw new Error(`cv-pdf: ${pagePath} answered ${res?.status()}`);
          await page.evaluate(() => document.fonts.ready);
          const pdf = await page.pdf({ format: 'Letter', preferCSSPageSize: true, tagged: true });
          await writeFile(join(root, out), pdf);
          logger.info(`${out} written (${Math.round(pdf.byteLength / 1024)} kB)`);
        } finally {
          await browser.close();
        }
      },
    },
  };
}
