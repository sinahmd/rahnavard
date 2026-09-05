import { expect, test, type Page } from '@playwright/test'
import { adminLogin } from './helpers'

// §3.6 session-auth smoke checklist, automated against the real stack
// (nginx → Next → Django). Covers the DEVELOPMENT.md §3.6 items that can be
// browser-driven; the non-admin 403 and dual-mode token internals stay
// covered by backend tests (apps/accounts/test_session_auth.py).

const BASE = process.env.E2E_BASE_URL || 'http://localhost'

async function trackAdminWrites(page: Page) {
  const writes: { method: string; url: string; csrf?: string }[] = []
  page.on('request', (req) => {
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method()) &&
      req.url().includes('/api/v1/') &&
      // Login is anonymous BY DESIGN (authentication_classes = []) — it is
      // the one write that must never require CSRF.
      !req.url().includes('/auth/login/')
    ) {
      writes.push({ method: req.method(), url: req.url(), csrf: req.headers()['x-csrftoken'] })
    }
  })
  return writes
}

async function goToCarDetail(page: Page): Promise<string> {
  const cars = await (await page.request.get('/api/v1/cars/')).json()
  const slug = cars?.results?.[0]?.slug as string
  expect(slug, 'dev DB must contain at least one car').toBeTruthy()
  await page.goto(`/cars/${encodeURIComponent(slug)}`)
  return slug
}

test('unauthenticated /admin is redirected to the login page', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('login reaches the dashboard with correct cookie flags', async ({ page }) => {
  await adminLogin(page)

  await expect(page.getByRole('heading', { name: 'داشبورد' })).toBeVisible()

  const cookies = await page.context().cookies()
  const session = cookies.find((c) => c.name === 'sessionid')
  const csrf = cookies.find((c) => c.name === 'csrftoken')
  expect(session, 'login must set the sessionid cookie').toBeTruthy()
  expect(session!.httpOnly).toBe(true)
  expect(csrf, 'login must bootstrap the csrftoken cookie').toBeTruthy()
  expect(csrf!.httpOnly).toBe(false) // readable on purpose: echoed as X-CSRFToken
})

test('logout destroys the session cookie and returns to the login page', async ({ page }) => {
  await adminLogin(page)
  await page.getByRole('button', { name: 'خروج' }).first().click()
  await expect(page).toHaveURL(/\/admin\/login/)

  const cookies = await page.context().cookies()
  expect(
    cookies.find((c) => c.name === 'sessionid'),
    'server-side logout must remove the session cookie',
  ).toBeUndefined()
})

// §3.6: "Visit the public homepage while logged OUT — page loads normally,
// NO redirect to /admin/login, and Network shows no /auth/session/ call."
test('logged-out public page never calls /auth/session/ and never redirects', async ({ page }) => {
  const sessionCalls: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/auth/session/')) sessionCalls.push(req.url())
  })

  await page.goto('/')
  expect(page.url()).toBe(`${BASE}/`)
  await expect(page.getByRole('navigation', { name: 'ناوبری اصلی' })).toBeVisible()
  expect(sessionCalls, 'public pages must stay auth-free').toEqual([])
})

// §3.6 (dual-mode item): the legacy `admin_token` key is left untouched
// during dual mode. FLIP AT CUTOVER: this becomes the one-time purge
// assertion (removeItem on first bootstrap, key gone afterwards).
test('legacy admin_token key is preserved during dual mode', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('admin_token', 'legacy-token-for-purge-test')
  })
  await page.goto('/admin/login')
  await expect(page.getByRole('heading', { level: 1, name: 'راهنورد' })).toBeVisible()

  const stored = await page.evaluate(() => window.localStorage.getItem('admin_token'))
  expect(stored).toBe('legacy-token-for-purge-test')
})

// §3.6: "Reload / hard-reload /admin/... — session restores without re-login."
test('hard reload restores the admin session without re-login', async ({ page }) => {
  await adminLogin(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'داشبورد' })).toBeVisible()
  expect(page.url()).not.toContain('/admin/login')
})

// §3.6: "delete sessionid, then click any admin nav item — expect redirect
// to /admin/login (401 policy)."
test('deleted session cookie redirects on the next admin navigation', async ({ page }) => {
  await adminLogin(page)

  await page.context().clearCookies()
  // The 401 policy may fire on any background fetch (redirecting before the
  // click lands) — the click is best-effort, the URL assertion is the gate.
  await page
    .getByRole('link', { name: 'ویژگی‌ها' })
    .click({ timeout: 5_000 })
    .catch(() => {})
  await page.waitForURL(/\/admin\/login/, { timeout: 15_000 })
})

// §3.6: "CRUD write smoke ... each must save without CSRF errors (check the
// Network tab for the X-CSRFToken header)." One full create → edit → delete
// through the real UI on the simplest entity (features — no required file).
// The entity is removed by the test itself.
test('admin CRUD writes carry X-CSRFToken and succeed end-to-end', async ({ page }) => {
  test.setTimeout(120_000)
  const writes = await trackAdminWrites(page)
  const title = `E2E-${Date.now()}`

  await adminLogin(page)

  // CREATE
  await page.goto('/admin/features/new')
  await page.getByLabel('عنوان').fill(title)
  await page.getByLabel('توضیحات').fill('ویژگی آزمایشی E2E — حذف خودکار')
  await page.getByRole('button', { name: 'ایجاد' }).click()
  await page.waitForURL(/\/admin\/features$/)
  const row = page.locator('tr', { hasText: title })
  await expect(row).toBeVisible()

  // EDIT
  await row.getByRole('link', { name: 'ویرایش' }).click()
  await page.waitForURL(/\/admin\/features\/\d+\/edit/)
  const edited = `${title}-v2`
  await page.getByLabel('عنوان').fill(edited)
  await page.getByRole('button', { name: 'بروزرسانی' }).click()
  await page.waitForURL(/\/admin\/features$/)
  await expect(page.locator('tr', { hasText: edited })).toBeVisible()
  // hasText is substring-based, so the edited row still matches `title`;
  // exclude it before asserting the original title is gone.
  await expect(page.locator('tr', { hasText: title }).filter({ hasNotText: edited })).toHaveCount(0)

  // DELETE (accessible ConfirmDialog — not window.confirm)
  await page.locator('tr', { hasText: edited }).getByRole('button', { name: 'حذف' }).click()
  const dialog = page.getByRole('dialog', { name: 'تأیید حذف' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'حذف' }).click()
  await expect(page.locator('tr', { hasText: edited })).toHaveCount(0)

  // Every write went out with the CSRF header (§3.6 Network-tab check).
  expect(writes.length, 'create + edit + delete = 3 admin writes').toBeGreaterThanOrEqual(3)
  const missing = writes.filter((w) => !w.csrf)
  expect(missing, `writes without X-CSRFToken: ${JSON.stringify(missing)}`).toEqual([])
})

// §3.6: "While logged in as admin, open the public consultation form and
// submit — must succeed (201) without a CSRF token (public inquiry is
// exempt)." Side effect: one inquiry row (name = E2E مشاوره) in the dev DB.
test('public consultation form accepts a logged-in admin without CSRF', async ({ page }) => {
  test.setTimeout(90_000)
  await adminLogin(page)
  await goToCarDetail(page)

  await page.getByRole('button', { name: 'درخواست مشاوره' }).click()
  await page.getByPlaceholder('نام و نام خانوادگی').fill('E2E مشاوره')
  await page.getByPlaceholder('۰۹۱۲ ۰۰۰ ۰۰ ۰۰').fill('09121234567')
  await page.getByRole('button', { name: 'ارسال درخواست مشاوره' }).click()

  await expect(page.getByRole('status')).toBeVisible()
})
