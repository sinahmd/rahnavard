import { devices, expect, test } from '@playwright/test'

/**
 * Phase 8 (UX-3) — hero swipe e2e, mobile emulation.
 *
 * Touch input is dispatched through Chrome's real input pipeline (CDP
 * Input.dispatchTouchEvent), so `touch-action: pan-y`, the non-passive
 * touchmove listener, and the browser's scroll arbitration interact exactly
 * as on a phone. Asserts:
 *   1. a horizontal swipe changes the active slide (the gesture completes),
 *   2. vertical page scrolling stays native (no scroll hijack),
 *   3. no `[Intervention]` touchmove warnings are logged.
 */

test.use({ ...devices['Pixel 7'] })

test('hero horizontal swipe completes the slide transition and vertical scroll stays native', async ({ page, context }) => {
  const interventionLogs: string[] = []
  page.on('console', (msg) => {
    if (msg.text().includes('[Intervention]')) interventionLogs.push(msg.text())
  })

  await page.goto('/')

  const hero = page.locator('div.touch-pan-y')
  await expect(hero).toBeVisible()

  // Active-slide discriminator: the active dot carries bg-accent (same as
  // the HeroSlider unit tests).
  const activeIndex = async () => {
    const classes = await hero
      .locator('button[aria-label^="اسلاید"]')
      .evaluateAll((els) => els.map((el) => el.className.includes('bg-accent')))
    return classes.indexOf(true)
  }

  const before = await activeIndex()
  const box = await hero.boundingBox()
  const cy = box!.y + box!.height / 2
  const x0 = box!.x + box!.width * 0.8
  const x1 = box!.x + box!.width * 0.2

  // ── 1. Horizontal swipe completes (real touch pipeline) ─────────────
  const cdp = await context.newCDPSession(page)
  const touchPoint = (x: number, y: number) => [{ x, y, id: 1 }]

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPoint(x0, cy) })
  // A slight vertical drift on the first move — the slope race that used to
  // stall the drag. The hysteresis lock must keep this gesture horizontal.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoint(x0 - 15, cy + 3) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoint(x0 - 40, cy + 4) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoint(x1, cy + 5) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

  await page.waitForTimeout(1200) // 900ms opacity/transform transition
  expect(await activeIndex()).not.toBe(before)

  // ── 2. Vertical scroll stays native ─────────────────────────────────
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPoint(200, cy) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoint(200, cy - 40) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoint(200, cy - 160) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(500)
  const scrollAfter = await page.evaluate(() => window.scrollY)
  expect(scrollAfter).toBeGreaterThan(scrollBefore)

  // ── 3. Zero Intervention warnings ───────────────────────────────────
  expect(interventionLogs).toEqual([])
})
