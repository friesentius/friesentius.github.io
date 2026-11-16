// Generates the social share image, public/og.png (1200x630), with Playwright's
// Chromium and the site's own self-hosted JetBrains Mono, so the result does
// not depend on fonts installed on the machine. Run `npm run og` after changing
// the name or tagline in src/data/site.ts, and commit the PNG.
//
// The text comes from src/data/site.ts; nothing is written here by hand.

import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { site } from '../src/data/site.ts';

const root = new URL('../', import.meta.url);
const font = new URL(
  'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  root,
);
// Inlined, because a page set from a string cannot load file:// URLs.
const fontData = (await readFile(font)).toString('base64');
const out = new URL('public/og.png', root);

const name = site.name ?? site.handle;
const github = site.github.replace(/^https?:\/\//, '');
const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The dark theme tokens from src/styles/global.css.
const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'JB';
    src: url('data:font/woff2;base64,${fontData}') format('woff2');
    font-weight: 100 800;
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: #070a08; color: #c9f5d2;
    font-family: 'JB', monospace; font-size: 26px; line-height: 1.5;
    padding: 48px;
    background-image: repeating-linear-gradient(to bottom, transparent 0 2px, rgb(0 0 0 / 0.24) 2px 3px);
  }
  .win { height: 100%; border: 2px solid #1f3527; border-radius: 10px; background: #0b110d; display: flex; flex-direction: column; }
  .bar { display: flex; justify-content: space-between; padding: 14px 28px; border-bottom: 2px solid #1f3527; background: #0f1812; color: #86a98e; font-size: 22px; }
  .bar b { color: #ffb000; font-weight: 600; }
  .body { padding: 36px 56px; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 22px; }
  .cmd { color: #86a98e; }
  .cmd i { color: #ffb000; font-style: normal; }
  h1 { font-size: 104px; line-height: 1.04; font-weight: 800; letter-spacing: -0.02em; text-shadow: 0 0 0.3em rgb(88 240 138 / 0.35); }
  .handle { color: #58f08a; font-size: 44px; font-weight: 600; }
  .cur { display: inline-block; width: 0.6em; height: 1.05em; margin-left: 0.15em; vertical-align: -0.16em; background: #58f08a; }
  .tag { font-size: 28px; max-width: 980px; color: #c9f5d2; }
  .foot { color: #86a98e; font-size: 22px; }
</style>
<div class="win">
  <div class="bar"><b>[${escapeHtml(site.handle)}]</b><span>${escapeHtml(github)}</span></div>
  <div class="body">
    <div class="cmd"><i>$</i> whoami</div>
    <h1>${escapeHtml(name)}</h1>
    <div class="handle">${escapeHtml(site.handle)}<span class="cur"></span></div>
    ${site.tagline ? `<p class="tag">${escapeHtml(site.tagline)}</p>` : ''}
  </div>
</div>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => document.fonts.check("700 20px 'JB'"));
  if (!loaded)
    throw new Error('JetBrains Mono did not load; refusing to write a fallback-font image');
  await page.screenshot({ path: out.pathname });
  console.log(`wrote ${out.pathname}`);
} finally {
  await browser.close();
}
