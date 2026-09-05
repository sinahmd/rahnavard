# E2E smoke specs (Playwright)

End-to-end coverage from plan §6.4 + the DEVELOPMENT.md §3.6 session smoke
checklist: public SSR content, CSP enforcement, and the session-cookie admin
auth flow. Everything runs against the **local Docker stack**
(`docker compose up`), not against a dev server.

Coverage map:
- `public.spec.ts` — SSR'd home content, enforced CSP header (dev/prod eval
  split asserted), `/cars` first-HTML cards → detail navigation.
- `admin-auth.spec.ts` — §3.6 matrix: guard redirect, login + cookie flags,
  logout (session cookie destroyed), logged-out public page never calls
  `/auth/session/`, legacy `admin_token` key handling, hard-reload session
  restore, deleted-session-cookie redirect, a full features-entity CRUD
  through the UI asserting `X-CSRFToken` on every write, and the public
  consultation form submitting while logged in (inquiry exemption). Side
  effect: the consultation test appends one inquiry row (name `E2E مشاوره`)
  to the dev DB.
- `csp-audit.spec.ts` — zero `securitypolicyviolation` events / console
  reports across public + admin pages (only Next-dev eval is allowed).

Tests run with `workers: 1` — Next dev compiles routes on demand and is
effectively single-threaded; parallel workers starve it.

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
