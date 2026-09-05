import { defineConfig, devices } from '@playwright/test'

// E2E smoke specs run against the full local Docker stack through nginx
// (same routing as production), NOT against `next dev` directly.
// Prerequisites and usage: see e2e/README.md.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  // Next dev compiles routes on demand and is effectively single-threaded —
  // concurrent workers starve it (timeouts/aborts). One worker keeps the
  // suite deterministic against the dev stack; routes warm up as tests run.
  workers: 1,
  // Cold route compilation can still abort a first hit; one retry (routes
  // then warm) keeps the suite stable.
  retries: process.env.CI ? 2 : 1,
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
