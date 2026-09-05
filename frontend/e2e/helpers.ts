import type { Page } from '@playwright/test'

// Dedicated seeded admin (see e2e/README.md). Override with
// E2E_ADMIN_USER / E2E_ADMIN_PASSWORD.
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'e2e_admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'e2epass123'

export async function adminLogin(page: Page): Promise<void> {
  await page.goto('/admin/login')
  await page.getByPlaceholder('نام کاربری خود را وارد کنید').fill(ADMIN_USER)
  await page.getByPlaceholder('رمز عبور خود را وارد کنید').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /ورود|submit/i }).click()
  await page.waitForURL(/\/admin(?!\/login)/)
}

export type CspViolation = {
  effectiveDirective: string
  blockedUrl: string
  sourceFile: string
  disposition: string
  sample: string
}

// Installs a `securitypolicyviolation` collector for every frame the page
// will ever load, plus a console-message net (Chromium also logs CSP
// violations to the console, which covers frames and workers uniformly).
// Returns an async getter that must be called after the last navigation.
export async function collectCspViolations(
  page: Page,
): Promise<() => Promise<{ events: CspViolation[]; console: string[] }>> {
  const consoleHits: string[] = []
  page.on('console', (msg) => {
    if (/content.security.policy/i.test(msg.text())) consoleHits.push(msg.text().slice(0, 300))
  })
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations: unknown[] }
    w.__cspViolations = []
    document.addEventListener('securitypolicyviolation', (e) => {
      w.__cspViolations.push({
        effectiveDirective: e.effectiveDirective,
        blockedUrl: (e.blockedURL || '').slice(0, 200),
        sourceFile: e.sourceFile || '',
        disposition: e.disposition,
        sample: (e.sample || '').slice(0, 120),
      })
    })
  })
  return async () => {
    const events = await page.evaluate(
      () => (window as unknown as { __cspViolations: CspViolation[] }).__cspViolations ?? [],
    )
    return { events, console: consoleHits }
  }
}

// Known dev-only allowance: Next.js dev/HMR evaluates strings as JavaScript
// ("unsafe-eval"). Chromium leaves `sample`/`blockedURL` empty on those
// events, so the reliable signal is the console text. The dev nginx conf
// carries 'unsafe-eval' once CSP is enforced; while the header is still
// Report-Only (or when auditing a conf without it) these violations are
// expected and must not fail the audit. Everything else is a real finding.
export function isKnownDevEval(v: CspViolation): boolean {
  if (v.effectiveDirective !== 'script-src') return false
  if (/eval/i.test(`${v.blockedUrl} ${v.sample}`)) return true
  // Chromium reports dev-runtime eval violations with empty blockedURL AND
  // empty sample; they all originate in Next's dev chunk files. Any other
  // script-src violation carries a blocked URL (external resource) or a
  // document sourceFile (inline) — both stay real findings.
  return !v.blockedUrl && !v.sample && /_next\/static\/chunks/.test(v.sourceFile)
}

// Console-text twin of the filter above (matches Chromium's exact wording).
export function isKnownDevEvalConsole(text: string): boolean {
  return /'unsafe-eval' is not an allowed source of script/i.test(text)
}
