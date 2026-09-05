import { expect, test } from '@playwright/test'
import { adminLogin, collectCspViolations, isKnownDevEval, isKnownDevEvalConsole } from './helpers'

// The CSP gate from plan §6.A.5: instead of passively waiting for a
// "violation-free review window", this audit sweeps every real page and
// asserts zero CSP violations. It passes under the Report-Only header
// (finding violations BEFORE anything is blocked) and keeps passing once
// the header is flipped to enforcing — where it doubles as proof the
// policy doesn't break the site.
//
// Expected-and-allowed: dev-mode eval() (see isKnownDevEval). Everything
// else is a real finding that must be tuned in the policy.

test('public pages produce zero CSP violations', async ({ page }) => {
  const getViolations = await collectCspViolations(page)

  for (const path of ['/', '/cars', '/articles']) {
    const resp = await page.goto(path)
    expect(resp?.status(), `GET ${path}`).toBe(200)
  }

  // Detail pages from live slugs (no fixture assumptions).
  const cars = await (await page.request.get('/api/v1/cars/')).json()
  const carSlug = cars?.results?.[0]?.slug as string | undefined
  if (carSlug) {
    const resp = await page.goto(`/cars/${encodeURIComponent(carSlug)}`)
    expect(resp?.status(), 'car detail').toBe(200)
  }
  const articles = await (await page.request.get('/api/v1/articles/')).json()
  const articleSlug = articles?.results?.[0]?.slug as string | undefined
  if (articleSlug) {
    const resp = await page.goto(`/articles/${encodeURIComponent(articleSlug)}`)
    expect(resp?.status(), 'article detail').toBe(200)
  }

  const { events, console: consoleHits } = await getViolations()
  const real = events.filter((v) => !isKnownDevEval(v))
  const realConsole = consoleHits.filter((t) => !isKnownDevEvalConsole(t))
  const report = JSON.stringify({ events, consoleHits }, null, 2)
  expect(real, `CSP violations:\n${report}`).toEqual([])
  expect(realConsole, `CSP console reports:\n${report}`).toEqual([])
})

test('admin flows produce zero CSP violations', async ({ page }) => {
  const getViolations = await collectCspViolations(page)

  const login = await page.goto('/admin/login')
  expect(login?.status()).toBe(200)

  await adminLogin(page)
  for (const path of ['/admin', '/admin/branches', '/admin/branches/new']) {
    const resp = await page.goto(path)
    expect(resp?.status(), `GET ${path}`).toBe(200)
    await expect(page.getByText('راهنورد')).toBeVisible() // shell actually rendered
  }

  const { events, console: consoleHits } = await getViolations()
  const real = events.filter((v) => !isKnownDevEval(v))
  const realConsole = consoleHits.filter((t) => !isKnownDevEvalConsole(t))
  const report = JSON.stringify({ events, consoleHits }, null, 2)
  expect(real, `CSP violations:\n${report}`).toEqual([])
  expect(realConsole, `CSP console reports:\n${report}`).toEqual([])
})
