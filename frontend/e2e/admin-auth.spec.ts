import { expect, test } from '@playwright/test'

// Session-cookie auth smoke over real nginx (Phase 2/6 behavior):
// guard redirect, login, httpOnly sessionid + readable csrftoken,
// dashboard reachable, logout returns to the login page.
//
// Credentials: a dedicated seeded admin (see e2e/README.md). Override with
// E2E_ADMIN_USER / E2E_ADMIN_PASSWORD.
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'e2e_admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'e2epass123'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByPlaceholder('نام کاربری خود را وارد کنید').fill(ADMIN_USER)
  await page.getByPlaceholder('رمز عبور خود را وارد کنید').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /ورود|submit/i }).click()
  await page.waitForURL(/\/admin(?!\/login)/)
}

test('unauthenticated /admin is redirected to the login page', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('login reaches the dashboard with correct cookie flags', async ({ page }) => {
  await login(page)

  await expect(page.getByText('داشبورد')).toBeVisible()

  const cookies = await page.context().cookies()
  const session = cookies.find((c) => c.name === 'sessionid')
  const csrf = cookies.find((c) => c.name === 'csrftoken')
  expect(session, 'login must set the sessionid cookie').toBeTruthy()
  expect(session!.httpOnly).toBe(true)
  expect(csrf, 'login must bootstrap the csrftoken cookie').toBeTruthy()
  expect(csrf!.httpOnly).toBe(false) // readable on purpose: echoed as X-CSRFToken
})

test('logout returns to the login page', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'خروج' }).first().click()
  await expect(page).toHaveURL(/\/admin\/login/)
})
