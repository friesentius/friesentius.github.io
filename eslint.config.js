// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'dist-email/',
      '.astro/',
      'node_modules/',
      'test-results/',
      'playwright-report/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    rules: {
      // The terminal output is a scrollable role="log"; it must be focusable
      // so keyboard users can scroll it.
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { tags: [], roles: ['log'] }],
    },
  },
);
