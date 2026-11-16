// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cvPdf from './scripts/cv-pdf.mjs';
import { cvPdfPath } from './src/data/cv.ts';

// A GitHub Pages user site is served from the domain root, so `site` is set
// and `base` is not. Change `site` when friesentius.com is attached.
export default defineConfig({
  site: 'https://friesentius.github.io',
  output: 'static',
  // The e2e suite builds a second copy with the email reveal switched on.
  outDir: process.env.OUT_DIR || './dist',
  trailingSlash: 'ignore',
  integrations: [sitemap(), cvPdf({ page: '/cv/', out: cvPdfPath })],
  vite: {
    plugins: [tailwindcss()],
  },
});
