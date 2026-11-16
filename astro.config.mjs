// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// A GitHub Pages user site is served from the domain root, so `site` is set
// and `base` is not. Change `site` when friesentius.com is attached.
export default defineConfig({
  site: 'https://friesentius.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
