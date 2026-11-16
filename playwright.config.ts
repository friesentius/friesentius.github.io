import { defineConfig, devices } from '@playwright/test';

const PORT = 4329;
const EMAIL_PORT = 4330;

// The e2e suite runs against the production build (`astro build` then
// `astro preview`), which is what GitHub Pages serves. A second build
// (`dist-email`, see the `test:e2e` script) has the public Turnstile and
// Worker values set, so the email reveal can be tested; email.spec.ts runs
// only against it.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      testIgnore: 'email.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${PORT}` },
    },
    {
      name: 'email',
      testMatch: 'email.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${EMAIL_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx astro preview --ignore-lock --host 127.0.0.1 --port ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `OUT_DIR=dist-email npx astro preview --ignore-lock --host 127.0.0.1 --port ${EMAIL_PORT}`,
      url: `http://127.0.0.1:${EMAIL_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
