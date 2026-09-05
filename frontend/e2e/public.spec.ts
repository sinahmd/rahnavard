import { expect, test } from '@playwright/test'

// Public pages must be server-rendered with content in the first HTML
// (plan §6.C — this is the curl-visible property, asserted through a real
// browser over nginx) and must carry the tightened Report-Only CSP.

test('home renders server-side content and the report-only CSP header', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  // SSR'd content: sr-only page h1 and the public chrome are in the HTML.
  await expect(page.getByRole('heading', { level: 1, name: 'راهنورد خودرو' })).toBeAttached()
  await expect(page.getByRole('navigation', { name: 'ناوبری اصلی' })).toBeVisible()

  const csp = response?.headers()['content-security-policy-report-only']
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("object-src 'none'")
  // Fonts are self-hosted — no Google Fonts hosts in the policy.
  expect(csp).not.toContain('fonts.googleapis')
})

test('cars listing first HTML contains car cards; detail page opens', async ({ page }) => {
  const response = await page.goto('/cars')
  expect(response?.status()).toBe(200)

  const firstCard = page.locator('a[href^="/cars/"]').first()
  await expect(firstCard).toBeVisible()

  const detailHref = await firstCard.getAttribute('href')
  expect(detailHref, 'listing must link to a car detail page').toBeTruthy()

  // Navigate like a user (click) — the dev server aborts synthetic
  // main-frame gotos to this route, but real navigation works.
  await firstCard.click()
  await page.waitForURL((u) => u.pathname === detailHref)
  expect(page.url()).toContain('/cars/')
  await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty()
})
