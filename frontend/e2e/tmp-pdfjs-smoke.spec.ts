import { expect, test } from '@playwright/test'
import { collectCspViolations } from './helpers'

/**
 * TEMPORARY Phase 6 smoke — real pdf.js integration against the Docker
 * stack. Requires dev data: a car whose `catalog_file` is set (attach a
 * generated PDF via the admin API before running; skipped otherwise).
 * Deleted after the documented verification run.
 */
test('pdf.js catalog viewer renders, navigates and zooms under CSP', async ({ page }) => {
  const getViolations = await collectCspViolations(page)

  const cars = await (await page.request.get('/api/v1/cars/')).json()
  const slugs = (cars?.results ?? []).map((c: { slug: string }) => c.slug)
  // catalog_file is exposed on the detail serializer only — probe each car.
  let slug: string | undefined
  for (const s of slugs) {
    const detail = await (await page.request.get(`/api/v1/cars/${encodeURIComponent(s)}/`)).json()
    if (detail?.catalog_file) {
      slug = s
      break
    }
  }
  test.skip(!slug, 'no car with catalog_file in dev data')
  if (!slug) return // narrows slug for TS; unreachable once the skip fired

  const consoleLog: string[] = []
  page.on('console', (msg) => consoleLog.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`))
  page.on('pageerror', (err) => consoleLog.push(`[pageerror] ${String(err).slice(0, 300)}`))
  page.on('response', (res) => {
    if (res.status() >= 400) consoleLog.push(`[http ${res.status()}] ${res.url()}`)
  })
  page.on('requestfailed', (req) =>
    consoleLog.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText}`)
  )

  await page.goto(`/cars/${encodeURIComponent(slug)}`)

  // Open the catalog tab — this mounts PdfViewer and triggers the lazy
  // pdf.js import + worker startup.
  await page.getByRole('tab', { name: 'کاتالوگ PDF' }).click()

  // Wait for either terminal state, dump the browser log for diagnosis,
  // then assert the ready indicator. (Digits are Latin — the Persian digit
  // display layer is Phase 9.)
  const readyOrError = page
    .getByText('صفحه 1 از 2')
    .or(page.getByText('بارگذاری کاتالوگ ناموفق بود.'))
  await readyOrError.first().waitFor({ timeout: 20_000 })
  // eslint-disable-next-line no-console
  console.log('BROWSER LOG:\n' + consoleLog.join('\n').slice(0, 3000))
  await expect(page.getByText('صفحه 1 از 2')).toBeVisible()

  // Navigate to page 2 (pdf.js actually renders it on the canvas).
  await page.getByRole('button', { name: 'صفحه بعد' }).click()
  await expect(page.getByText('صفحه 2 از 2')).toBeVisible()

  // Zoom in one step.
  await page.getByRole('button', { name: 'بزرگ‌نمایی' }).click()
  await expect(page.getByText('125٪')).toBeVisible()

  // Canvas is present and has non-zero size (pdf.js drew into it).
  const box = await page.locator('canvas').boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(0)
  expect(box?.height ?? 0).toBeGreaterThan(0)

  // Escape hatch links point at the raw media URL.
  await expect(page.getByRole('link', { name: 'مشاهده در تب جدید' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'دانلود' })).toBeVisible()

  // No CSP violations from the viewer, the worker, or the canvas pipeline.
  const { events, console: consoleHits } = await getViolations()
  const logDump = consoleLog.join('\n').slice(0, 3000)
  expect(events, `CSP events: ${JSON.stringify(events)}\nBROWSER LOG:\n${logDump}`).toEqual([])
  expect(consoleHits, `CSP console: ${JSON.stringify(consoleHits)}\nBROWSER LOG:\n${logDump}`).toEqual([])
})
