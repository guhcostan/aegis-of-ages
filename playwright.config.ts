import { defineConfig, devices } from '@playwright/test';

/**
 * e2e configuration.
 *
 * By default the suite runs against the deployed production build, because that
 * is what "Pronto" requires. Set BASE_URL to point somewhere else (a preview
 * URL or http://localhost:4173) when iterating locally.
 */
const BASE_URL = process.env.BASE_URL ?? 'https://aegis-of-ages.guhcostan.workers.dev';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1600, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      args: [
        // Deterministic, GPU-less rendering in CI.
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
