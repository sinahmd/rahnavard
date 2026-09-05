import { expect, test } from '@playwright/test'
import { adminLogin } from './helpers'

// Session-cookie auth smoke over real nginx (Phase 2/6 behavior):
// guard redirect, login, httpOnly sessionid + readable csrftoken,
// dashboard reachable, logout returns to the login page.

test('unauthenticated /admin is redirected to the login page', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('login reaches the dashboard with correct cookie flags', async ({ page }) => {
  await adminLogin(page)

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
  await adminLogin(page)
  await page.getByRole('button', { name: 'خروج' }).first().click()
  await expect(page).toHaveURL(/\/admin\/login/)
})
