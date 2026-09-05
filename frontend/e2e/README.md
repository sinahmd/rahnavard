# E2E smoke specs (Playwright)

Minimal end-to-end coverage from plan §6.4 / §6.K: public SSR content through
nginx and the session-cookie admin auth flow. Everything runs against the
**local Docker stack** (`docker compose up`), not against a dev server.

## One-time setup

1. Start the stack: `docker compose up -d`
2. Seed the dedicated E2E admin (never reuse your own account):

   ```bash
   docker compose exec backend python manage.py shell -c "
   from django.contrib.auth.models import User
   u, _ = User.objects.get_or_create(username='e2e_admin', defaults={'is_staff': True, 'is_superuser': True, 'email': 'e2e@example.com'})
   u.is_staff = u.is_superuser = True
   u.set_password('e2epass123'); u.save()"
   ```

3. System Chrome is used via `channel: 'chrome'` — no browser download. If
   Chrome is not installed, run `npx playwright install chromium` once and
   remove the `channel` option in `playwright.config.ts`.

## Run

```bash
cd frontend
npx playwright test
```

Useful flags: `--headed`, `--ui`, `npx playwright show-report` (after
`--reporter=html`). Override target or credentials with `E2E_BASE_URL`,
`E2E_ADMIN_USER`, `E2E_ADMIN_PASSWORD`.

These specs are excluded from jest (`testPathIgnorePatterns`) and from CI for
now — they require the full stack and a seeded user, which CI doesn't have.
