import { defineConfig, devices } from '@playwright/test'

// E2E smoke specs run against the full local Docker stack through nginx
// (same routing as production), NOT against `next dev` directly.
// Prerequisites and usage: see e2e/README.md.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost',
    trace: 'retain-on-failure',
  },
  projects: [
    // System Chrome via channel keeps the setup dependency-free (no
    // `npx playwright install` download). If Chrome is not installed,
    // run `npx playwright install chromium` and drop the channel option.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
})
