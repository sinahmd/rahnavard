# Rahnavard Automotive — Project Rules & Conventions

## Project Overview
- **Type**: Full-stack automotive website
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Django 4.2, Django REST Framework, PostgreSQL
- **Deployment**: Docker, Arvan Cloud, GitHub Actions CI/CD
- **Language**: Persian (Farsi), RTL layout
- **Domain**: rahnavard.co

---

## 1. Testing Rules

### ⚠️ Run everything on local Docker (owner convention)

The owner develops and verifies the whole stack on **local Docker** — `docker compose up`
(runs nginx/frontend/backend/postgres, app entry point is http://localhost).
**Agents should run tests/checks with `docker compose exec`** rather than a host
venv/node_modules, unless the owner says otherwise.

```bash
# Backend — the dev image now installs requirements-dev.txt (pytest included)
# at build time, so a rebuilt backend image runs tests directly:
docker compose exec -T backend python -m pytest -q          # 282 passed, 98.32% cov (2026-09-05)
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py makemigrations --check --dry-run
# pytest uses config.test_settings → SQLite :memory: (no Postgres needed for tests)

# Frontend — all tooling (jest/tsc/eslint/next) is installed in the image.
# The LOCAL dev frontend/Dockerfile uses the China npm mirror
# (registry.npmmirror.com) — the Arvan mirror (npm.arvancloud.ir) 403s outside
# Iran — so `docker compose up --build` works locally.
docker compose exec -T frontend npm test -- --runInBand      # 302 passed, 40 suites, zero act/console warnings (2026-09-05)
docker compose exec -T frontend npx tsc --noEmit
docker compose exec -T frontend npm run lint
# Production build in a throwaway container so the running dev server's .next
# volume is never touched:
docker compose run --rm --no-deps frontend npm run build
```

Verified green inside Docker on 2026-09-05 (backend **282 passed** / 98.32%
cov, frontend **302 passed**, tsc clean, **lint fully clean** — fonts are
self-hosted via `next/font/local` (frontend/lib/fonts.ts), so the old Google
Fonts `<link>` warning is gone. Never switch to `next/font/google`: prod
images are built on a server where Google Fonts is blocked, see plan §J —
local files only).

---

### Backend Tests (pytest) — host alternative
```bash
cd backend
pip install -r requirements-dev.txt
pytest                          # Run all tests
pytest --cov=apps              # Run with coverage
pytest apps/cars/tests.py      # Run specific app tests
pytest -k "test_login"         # Run specific test
```

**Coverage Requirement**: 50% minimum (increase gradually)

**Test Structure:**
```python
import pytest

@pytest.mark.django_db
class TestFeatureName:
    """Tests for FeatureName."""

    def test_specific_behavior(self, api_client, sample_data):
        """Test description."""
        response = api_client.get('/api/v1/endpoint/')
        assert response.status_code == 200
        assert response.data['field'] == 'expected'
```

**Required Test Coverage:**
- All API endpoints (GET, POST, PUT, PATCH, DELETE)
- Authentication and permissions
- Model methods and properties
- Serializer validation
- Edge cases (empty data, invalid data, not found)

### Frontend Tests (Jest + React Testing Library) — host alternative
```bash
cd frontend
npm test                      # Run all tests (prefer the docker exec form above)
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage report
```

**Coverage Requirement**: 50% minimum (increase gradually)

**Test Structure:**
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ComponentName from '../ComponentName'

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    render(<ComponentName />)
    await userEvent.click(screen.getByRole('button'))
    // Assert expected behavior
  })
})
```

**Required Test Coverage:**
- All components render correctly
- User interactions (clicks, form submissions)
- API calls and responses
- Loading and error states
- Authentication flows

### CI/CD Test Integration
Tests run automatically on every push:

**Pipeline Flow:**
```
Push to main
    ↓
lint-frontend + lint-backend (parallel)
    ↓
test-frontend + test-backend (parallel)
    ↓
build-frontend + build-backend (parallel)
    ↓
deploy (only on main branch push)
```

**Test Jobs:**
```yaml
# Frontend tests
- name: Run tests
  run: npm test -- --coverage --watchAll=false

# Backend tests (with PostgreSQL service)
- name: Run tests
  run: pytest --cov=apps --cov-report=term-missing
```

**Requirements:**
- All tests must pass before deployment
- Coverage reports generated in CI
- Backend tests use PostgreSQL service container

---

## 2. Lint & Build Rules

### Frontend (Next.js)
```bash
# Always run before committing
cd frontend
npm run lint        # ESLint check
npx tsc --noEmit    # TypeScript type check
npm run build       # Production build test
```

**Common fixes:**
- Remove unused imports
- Add proper TypeScript types (avoid `any`)
- Use `interface` for object types, `type` for unions
- Client components must have `'use client'` directive
- Server components should NOT use hooks, useState, useEffect

### Backend (Django)
```bash
# Always run before committing
cd backend
python manage.py check                    # Django system check
python manage.py makemigrations --check   # Verify migrations are up to date
python manage.py lint                     # If flake8 is installed
```

**Common fixes:**
- Run `makemigrations` after model changes
- Add `verbose_name` to all model fields
- Use `db_index=True` for frequently queried fields

---

## 2. URL Conventions

### API URLs (Django)
```
Public API:     /api/v1/{resource}/
Admin API:      /api/v1/admin/{resource}/
Auth API:       /api/v1/auth/{action}/
Django Admin:   /django-admin/
```

**Examples:**
```
GET  /api/v1/cars/              → Public car list
GET  /api/v1/cars/{slug}/       → Public car detail
GET  /api/v1/admin/cars/        → Admin car list (requires auth)
POST /api/v1/admin/cars/        → Create car (requires auth)
POST /api/v1/auth/login/        → Login
POST /api/v1/auth/logout/       → Logout
```

### Frontend URLs (Next.js)
```
/                   → Home page
/cars               → Cars listing
/cars/[slug]        → Car detail
/articles           → Articles listing
/articles/[slug]    → Article detail
/admin              → Custom admin dashboard
/admin/cars         → Admin cars management
/admin/articles     → Admin articles management
/django-admin/      → Django admin (superuser only)
```

### ⚠️ CRITICAL: URL Pattern Matching
**Django URLs use `admin/{resource}/` NOT `{resource}/admin/`**

```python
# ✅ CORRECT
path("admin/cars/", views.CarAdminListView.as_view())

# ❌ WRONG
path("cars/admin/", views.CarAdminListView.as_view())
```

**Frontend API calls must match:**
```typescript
// ✅ CORRECT
fetch('/api/v1/admin/cars/')

// ❌ WRONG
fetch('/api/v1/cars/admin/')
```

---

## 3. Authentication & Token Handling

### Token Storage
```typescript
// Frontend stores token in localStorage
localStorage.setItem('admin_token', token)
localStorage.getItem('admin_token')
localStorage.removeItem('admin_token')
```

### API Requests with Auth
```typescript
// Always include Token prefix
headers: {
  'Authorization': `Token ${token}`,
  'Content-Type': 'application/json',
}
```

### Protected Endpoints
```python
# Django views that require authentication
from rest_framework import permissions

class AdminView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
```

### Auth Flow
1. User logs in via `/api/v1/auth/login/`
2. Backend returns `{ token: "...", user: {...} }`
3. Frontend stores token in localStorage
4. All subsequent API calls include `Authorization: Token xxx`
5. On 401 response, redirect to `/admin/login`

---

## 4. Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SITE_URL=https://rahnavard.co
NEXT_PUBLIC_API_URL=/api/v1    # Use relative path for same-domain
```

### Backend (.env)
```bash
DEBUG=0
SECRET_KEY=<strong-random-key>
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co,backend,localhost,127.0.0.1
DATABASE_URL=postgres://user:password@postgres:5432/rahnavard
CORS_ALLOWED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co
CSRF_TRUSTED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co
```

### ⚠️ CRITICAL: ALLOWED_HOSTS
Always include `localhost` and `127.0.0.1` for health checks:
```bash
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co,backend,localhost,127.0.0.1
```

### ⚠️ CRITICAL: SSL Configuration
Arvan Cloud handles SSL. Django must NOT redirect to HTTPS:
```python
SECURE_SSL_REDIRECT = False  # Arvan handles SSL
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

---

## 5. Branching Strategy

```
main ─────────────────── Production (rahnavard.co) — auto-deploys
  ↑ merge PR
develop ──────────────── Local dev & staging — CI only, no deploy
  ↑ work here
feature/* ─────────────── Individual features
```

- `develop` is the primary working branch
- `main` is production — never commit directly, always merge from develop
- CI runs on both `main` and `develop`; deploy only triggers on `main`
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full workflow guide

---

## 6. Docker & Deployment

### Development
```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Production
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### ⚠️ CRITICAL: Health Checks
Backend health check uses `localhost`:
```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/settings/')"]
```

### Deployment Flow

**CI/CD Pipeline (Separate Concerns):**
```
ci.yml    → Runs on every push/PR (lint + test + build check)
deploy.yml → Runs on push to main OR manual trigger
```

**Automatic Deployment:**
1. Push to `main` branch
2. `ci.yml` runs tests
3. `deploy.yml` deploys to server (independent)

**Manual Deployment (without code changes):**
1. Go to GitHub → Actions → "Deploy to Production"
2. Click "Run workflow"
3. Options:
   - Force rebuild Docker images: true/false
   - Run database migrations: true/false

**Server Quick Deploy:**
```bash
cd /var/www/rahnavard

# Full deploy (pull + build + restart)
./scripts/quick-deploy.sh

# Skip build (just restart)
./scripts/quick-deploy.sh --no-build

# Only pull code
./scripts/quick-deploy.sh --pull-only
```

---

## 7. Database & Migrations

### After Model Changes
```bash
# Generate migrations
python manage.py makemigrations app_name

# Apply migrations
python manage.py migrate

# Check for issues
python manage.py check
```

### ⚠️ CRITICAL: Migration Files
Always commit migration files to git. They must be in the repo for CI/CD to work.

---

## 8. Component Architecture

### Server Components (Default)
```tsx
// app/page.tsx - No 'use client' directive
export default function HomePage() {
  return <div>...</div>
}
```

### Client Components (When Needed)
```tsx
'use client'

import { useState, useEffect } from 'react'

export default function InteractiveComponent() {
  const [state, setState] = useState()
  // ...
}
```

### When to Use 'use client'
- useState, useEffect, useRef
- Event handlers (onClick, onChange)
- Browser APIs (localStorage, window)
- Interactive UI (sliders, forms, modals)

### When NOT to Use 'use client'
- Static content display
- Data fetching in Server Components
- SEO-critical content

---

## 9. API Response Format

### List Endpoints
```json
{
  "count": 10,
  "next": "http://...",
  "previous": null,
  "results": [...]
}
```

### Detail Endpoints
```json
{
  "id": 1,
  "field": "value",
  ...
}
```

### Error Responses
```json
{
  "detail": "Error message",
  "field_name": ["Field-specific error"]
}
```

---

## 10. Image Handling

### Upload Path
```python
# Django models
image = models.ImageField(upload_to='cars/')      # → media/cars/
image = models.ImageField(upload_to='hero/')       # → media/hero/
image = models.ImageField(upload_to='articles/')   # → media/articles/
```

### Next.js Image Component
```tsx
<Image
  src={car.main_image}  // URL from API
  alt={car.persian_name}
  width={400}
  height={300}
  loading="lazy"
/>
```

### Image Domains (next.config.js)
```javascript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'rahnavard.co', pathname: '/media/**' },
  ],
}
```

---

## 11. Common Pitfalls to Avoid

### ❌ DON'T
1. Use `process.env.NEXT_PUBLIC_API_URL` in client components (use `/api/v1` directly)
2. Use `csrf_exempt(include(...))` in Django URLs (breaks routing)
3. Set `SECURE_SSL_REDIRECT = True` when using Arvan Cloud
4. Forget `localhost` in ALLOWED_HOSTS
5. Commit without running lint/build checks
6. Use `any` type in TypeScript
7. Put `'use client'` on Server Components
8. Use localStorage in Server Components

### ✅ DO
1. Use relative API paths in client components: `/api/v1/cars/`
2. Run `npm run lint` and `python manage.py check` before committing
3. Include migration files in commits
4. Add `verbose_name` to Django model fields
5. Use proper TypeScript interfaces
6. Keep `'use client'` as low in the tree as possible
7. Handle loading and error states in UI

---

## 12. File Structure

```
rahnavard/
├── frontend/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (Server)
│   │   ├── page.tsx            # Home page (Server)
│   │   ├── admin/              # Admin pages (Client)
│   │   └── cars/               # Public pages (Server)
│   ├── components/
│   │   ├── layout/             # Header, Footer
│   │   ├── home/               # Home page sections
│   │   └── admin/              # Admin components
│   ├── contexts/               # React contexts (Client)
│   └── lib/                    # Utilities (api.ts)
├── backend/
│   ├── apps/
│   │   ├── core/               # Settings, hero, features
│   │   ├── cars/               # Car management
│   │   ├── articles/           # Article management
│   │   ├── branches/           # Branch management
│   │   ├── inquiries/          # Inquiry management
│   │   └── accounts/           # Authentication
│   └── config/                 # Django settings
├── nginx/                      # Nginx config
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
└── .github/workflows/          # CI/CD
```

---

## 13. Testing Checklist

Before every commit:
- [ ] `npm run lint` passes (frontend)
- [ ] `npx tsc --noEmit` passes (frontend)
- [ ] `python manage.py check` passes (backend)
- [ ] `python manage.py makemigrations --check` passes (backend)
- [ ] No `console.log` in production code
- [ ] No hardcoded mock data
- [ ] All API calls use correct URL patterns
- [ ] Auth tokens handled correctly

---

## 14. Deployment Checklist

Before deploying:
- [ ] All changes committed and pushed
- [ ] GitHub Actions CI passes
- [ ] `.env` on server has correct values
- [ ] `ALLOWED_HOSTS` includes `localhost,127.0.0.1`
- [ ] `SECURE_SSL_REDIRECT = False` (Arvan handles SSL)

After deploying:
- [ ] Run migrations if needed
- [ ] Create superuser if needed
- [ ] Verify API returns data
- [ ] Verify frontend loads
- [ ] Check admin panel works

---

## 15. Emergency Commands

### Reset Database (DANGER - loses all data)
```bash
docker compose -f docker-compose.prod.yml down
docker volume rm rahnavard_postgres_data
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Single Service
```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## 16. Contact & Support

- **Repository**: github.com/sinahmd/rahnavard
- **Domain**: rahnavard.co
- **Server**: Arvan Cloud

---

## 17. Session History (Cross-Session Memory)

> **Update this section at the end of every session.** Summarize what was done, what's in progress, and what the next steps are. This is the only persistent memory across sessions — the AI has no other recall.

### Format Template
```
### Session — [DATE]
- **Goal**: What the user wanted
- **Done**: What was completedn- **Files touched**: Key files modified
- **In progress / Next steps**: What remains
- **Decisions made**: Any architectural or design choices
```

---

### Session — 2026-09-05 — CSP enforcement + Phase 2 cutover (session-only auth)
- **Goal**: Land the two remaining gates of the refactor plan: (A) flip CSP from Report-Only to enforcing, (B) remove TokenAuthentication (Phase 2 cutover) — both gated on explicit owner approval, which the approved plan provided. All §3.6 checklist items automated and executed.
- **Done** (7 commits on `develop`):
  - `9a1769b` test(e2e): **CSP violation audit** (`e2e/csp-audit.spec.ts` + `helpers.ts`) — `securitypolicyviolation` collector (all frames) + console net over `/`, `/cars`, `/articles`, live car/article details, `/admin/login`, logged-in dashboard/branches/branches-new. Zero violations is the flip precondition; sole allowance = Next-dev `eval()` (empty blockedURL AND empty sample, `_next/static/chunks` sourceFile + exact Chromium console wording `'unsafe-eval' is not an allowed source of script`). adminLogin() extracted to helpers.
  - `153d71a` feat(security): **CSP ENFORCED** — header name flip in prod nginx (server + /media/) and dev; dev adds `'unsafe-eval'` (Next dev/HMR); prod must never. public.spec asserts the enforced header + the dev/prod eval split. Rollback = revert header name.
  - `4691380` test(e2e): **§3.6 checklist automated** — logged-out public page never calls /auth/session/ nor redirects; legacy admin_token key preserved during dual-mode (assertion flipped at cutover); hard-reload session restore; deleted-session-cookie behavior; full features-entity create→edit→delete through the real UI with `X-CSRFToken` asserted on every write (login POST excluded — anonymous by design); public consultation form submitted while logged in (exemption) → `role="status"`; logout destroys the session cookie. Playwright `workers: 1` — parallel workers starve Next dev's on-demand compilation.
  - `e8d61f0` **feat(auth): remove TokenAuthentication** — SessionAuthentication only; `rest_framework.authtoken` out of INSTALLED_APPS; login returns exactly `{user}`; change-password keeps `update_session_auth_hash` (no token rotation); logout session-only; **deleted the accounts `post_save` signal** that minted a token per user (would crash every user creation post-removal). `authtoken_token` TABLE left in place (Django never drops; rows inert). **Behavioral delta**: unauthenticated requests to protected endpoints now answer **403** (no WWW-Authenticate challenge without Token) — ten requires-auth expectations updated.
  - `f366cd0` refactor(auth): **one-time `admin_token` purge** in AuthContext bootstrap (never reads/writes credentials); `LoginResponse` → `{user}`; `fetchSession` treats 401 AND 403 as unauthenticated (guard owns the redirect); e2e flipped to post-cutover contracts (purge polled hydration-safe; deleted-cookie soft-nav surfaces the error state while hard-nav re-bootstraps and redirects); CSP collector fixed to read `blockedURI` (`blockedURL` doesn't exist on the DOM event — it silently returned undefined).
  - Docs commit: DEVELOPMENT.md §3.6 marked **EXECUTED/PASSED** with the two post-cutover behavior deltas recorded inline, new §3.11 (cutover record), §3.10 CSP → enforced, README dual-mode section → session-only, ADR-0001 status → Implemented/cutover complete, ADR-0006 CSP → enforced.
- **Gotchas hit** (all real, all documented): (1) e2e batch failures were Next-dev compile starvation under 4 parallel workers — `workers: 1` fixed it; (2) the 401→403 DRF challenge change broke 10 tests AND would have silently weakened the bootstrap (fetchSession now handles both); (3) the CSP audit's blockedUrl was always empty because the DOM event property is `blockedURI` — found by tsc in the container; (4) the e2e purge test failed because the SSR'd heading renders before hydration — `expect.poll` instead of assert-after-visible; (5) after editing frontend source on Windows, `next dev` in the container kept serving OLD chunks (Docker Desktop fs-event gap, known since Phase 2) — fix: stop → `docker compose rm -f frontend` → up (fresh `.next`); (6) `/app/node_modules` is an anonymous volume — image rebuilds don't add deps; use in-container `npm install`.
- **Validation (Docker + stack, 2026-09-05)**: backend **282 passed / 98.32% cov** (286 → 282: 7 legacy-token tests replaced by 4 new contracts); frontend **302 jest** (new: purge contract + 403-bootstrap-no-redirect), `tsc` clean, `lint` clean; **13/13 e2e** post-cutover; `nginx -t` on both confs; curl: login response keys exactly `['user']`, no token; repo grep zero runtime `TokenAuthentication`/`authtoken`/`admin_token`.
- **Files touched**: backend/config/settings.py, backend/apps/accounts/{views,models,tests,test_session_auth}.py + the 4 apps' tests (401→403), nginx/{nginx,nginx.dev}.conf, frontend/e2e/{helpers,csp-audit.spec,admin-auth.spec,public.spec}.ts + README, frontend/playwright.config.ts, frontend/contexts/AuthContext.tsx + tests, frontend/lib/api/{auth,http}.ts, README.md, DEVELOPMENT.md, CLAUDE.md, docs/adr/{0001,0006}
- **In progress / Next steps**: merge develop → main when ready (auto-deploys); one manual spot-check on rahnavard.co after deploy: login, one CRUD save, public form submit while logged in, check CSP headers. Optional: drop the inert `authtoken_token` table via one-off SQL.
- **Decisions made**: (1) plan approval = the owner approval §6.A.4 required; the checklist was automated and executed BEFORE the removal commit. (2) Do NOT redirect on 403 in http.ts — that would loop for authenticated-but-forbidden (non-staff) users; the guard owns post-bootstrap redirects. (3) Keep the `authtoken_token` table (no destructive SQL). (4) CSP audit allowance is surgically scoped to dev-eval; everything else fails the gate.

---

### Session — 2026-09-05 — Phase 6 (hardening & delivery)
- **Goal**: Complete Phase 6 of docs/SENIOR_REFACTOR_PLAN.md — finish the in-flight work a previous agent left uncommitted (CSP, cookie flags, local-only guard, secret-scan CI, deploy hardening), verify it in Docker, land it as conventional commits, then do 6.3 (ADRs + README + scratch-doc consolidation) and 6.4 (minimal Playwright e2e).
- **State found**: 12 modified files + 2 untracked scripts, unverified and uncommitted. **One real blocker**: the new CI `secret-scan` job referenced `scripts/scan-secrets.sh`, but `.gitignore`'s `*secret*` rule ignored the script itself (it could never be committed; the job would fail on push). Also `nginx/nginx.conf` had been rewritten with mixed CRLF/CR line endings (whole-file noise diff), and `scripts/_local_only_guard.sh` was untracked while three committed scripts sourced it.
- **Done** (9 commits on `develop`):
  - `4f312c6` feat(security): explicit cookie flags — `SESSION_COOKIE_HTTPONLY=True`, `SESSION_COOKIE_SAMESITE="Lax"`, `CSRF_COOKIE_HTTPONLY=False` (readable on purpose: echoed as X-CSRFToken), `CSRF_COOKIE_SAMESITE="Lax"`; new pytest pins flags on the login response (morsel assertions).
  - `db8a451` feat(security): CSP → tightened **Report-Only** in prod + dev nginx (drops jsdelivr/googleapis/gstatic now that fonts are self-hosted; adds base-uri/object-src/form-action). `nginx.conf` line endings normalized back to LF first (diff: 242 lines → 2). Enforcement flip is a separate deliberate step (dev conf will need `'unsafe-eval'` for HMR when enforcing).
  - `d30463e` ci(security): secret-scan job + `scripts/scan-secrets.sh` (git grep over TRACKED files, format-based rules, never prints matched content; passed locally) + `!scripts/scan-secrets.sh` gitignore negation (staged as a surgical hunk so the unrelated `.local-only-backup/` hunk landed in the guard commit).
  - `f6423a7` fix(scripts): `scripts/_local_only_guard.sh` shared guard — sourced by prepare-merge/apply-local-only/check-local-only; refuses protected production paths (settings.py, prod compose/Dockerfiles/entrypoint, prod nginx, workflows) in LOCAL_ONLY_FILES.txt or restore backups; **settings.py removed from the list** (previously every develop→main merge would have reverted the Phase-2 auth config on main). `.gitignore` now ignores the real `.local-only-backup/` dir.
  - `f36ce63` chore(deploy): deploy.yml + quick-deploy.sh — explicit idempotent migrate → rolling restart (backend → health gate → frontend → nginx force-recreated LAST) → end-to-end health through nginx, logs + non-zero exit on failure. No more blind down/up.
  - `848bc17` docs(adr): **docs/adr/0001–0006** (session auth; route structure/login outside guard; lib/api vs lib/data boundaries; SSR + URL single-source; no-new-client-deps; Phase 6 infra hardening incl. the recorded deviation). `.gitignore` `docs/` → `docs/*` + `!docs/adr/` so ADRs track while scratch docs stay ignored.
  - `mv`/`git mv`: superseded docs (ARCHITECTURE.md, STEP_BY_STEP_ROADMAP.md, IMPLEMENTATION_REPORT.md, FINAL_PRODUCTION_REPORT.md, PRODUCTION_* checklists, PHASE1_IMPLEMENTATION_COMPLETE.md, CI_CD_IMPLEMENTATION_PLAN.md, agents/developer_car_feature_implementation.md) → **docs/archive/** with a README mapping each to its replacement; empty `agents/` removed.
  - Docs refresh: README Refactor Status → Phases 0–6 done + "Deliberately not used" section + archive pointer; DEVELOPMENT.md §11 (3 local-only files + guard warning), §7 manual fallback no longer stashes settings.py, new **§3.10 Phase 6 status** (a first edit accidentally deleted §3.9's coverage bullet and the §3.6 heading — caught by heading grep and restored); CLAUDE.md numbers → backend 286.
  - `test(e2e)`: **Playwright smoke specs** (frontend/e2e/{public,admin-auth}.spec.ts + playwright.config.ts + e2e/README.md) — 5 specs against the real stack through nginx: home SSR content + Report-Only CSP header assertions, /cars first-HTML cards → detail navigation, admin guard redirect, login → dashboard with **cookie flags asserted on real cookies** (`sessionid` httpOnly, `csrftoken` JS-readable), logout. System Chrome via `channel: 'chrome'` (no browser download); dedicated `e2e_admin` seeded in the dev DB (documented in e2e/README.md); specs excluded from jest via `testPathIgnorePatterns`; `@playwright/test` added as devDependency. Fixed: first-card navigation via `page.goto` got `net::ERR_ABORTED` from the dev server → spec clicks the card like a user instead. Gotcha re-learned: **`/app/node_modules` is an anonymous volume that survives image rebuilds** — new deps need the documented `docker compose exec frontend npm install` (host-side install alone leaves container tsc failing on missing types).
- **Validation (Docker, 2026-09-05)**: backend **286 passed / 98.32% cov** (includes the new cookie-flag test); `nginx -t` green on BOTH the dev conf (running container) and the prod conf (docker cp + `nginx -t -c`, needed `MSYS_NO_PATHCONV=1` — Git Bash mangles `-c /tmp/...` paths); CSP-Report-Only header verified via curl through dev nginx; settings API 200; `bash -n` clean on all six changed scripts; guard function tested directly (rejects settings.py/nginx.conf with exit 1); `scan-secrets.sh` exit 0; `check-local-only.sh` green on main..develop. Frontend in-container: **301 jest** (e2e excluded), `tsc` clean, `lint` clean; **5/5 Playwright specs passed** on the host against the stack.
- **Files touched**: backend/config/settings.py, backend/apps/accounts/test_session_auth.py, nginx/nginx.conf, nginx/nginx.dev.conf, .github/workflows/{ci,deploy}.yml, scripts/{scan-secrets,_local_only_guard,prepare-merge,apply-local-only,check-local-only,quick-deploy}.sh, LOCAL_ONLY_FILES.txt, .gitignore, docs/adr/* (6 new), docs/archive/* (9 moved + README), README.md, DEVELOPMENT.md, CLAUDE.md, frontend/{playwright.config.ts, jest.config.js, package.json, package-lock.json}, frontend/e2e/{public.spec.ts, admin-auth.spec.ts, README.md}
- **In progress / Next steps**: CSP enforcement flip after a violation-free browser window (documented in DEVELOPMENT.md §3.10). Phase 2 cutover still gated on §3.6 staging smoke + owner approval. Branch is ~74 commits ahead of origin/develop — push is the owner's call.
- **Decisions made**: (1) **Harden the local-only dance instead of retiring it** (plan §6.L said retire; deviation recorded in ADR-0006) — the guard structurally closes the actual hazard (settings.py reverts) with far less deploy-path risk; full retirement via gitignored docker-compose.override.yml remains possible later. (2) CSP ships Report-Only per plan §6.A.5 — enforcement needs a violation review first. (3) ADRs live in tracked `docs/adr/` while `docs/*` scratch stays ignored (`!docs/archive/README.md` negated so the archive mapping is tracked). (4) E2E kept minimal (5 specs, no CI wiring): the plan marks 6.4 optional; CI lacks the stack + seeded user, and admin CRUD via UI is deliberately covered by the existing RTL integration tests instead of a brittle browser script.

---

### Session — 2026-09-05 — Gallery filename scheme accepted as debt + collision test
- **Goal**: Close the smoke observation about slug-based gallery filenames without changing the scheme — document it as deferred technical debt and pin the no-collision guarantee with a test.
- **Done**: added `test_distinct_active_cars_do_not_collide_gallery_files` in `TestCarAdminGalleryAndPagination` — two active cars uploading `gallery_0..N` through the admin multipart API produce four distinct URLs and four distinct on-disk files (the partial unique slug index guarantees distinct slugs). Full backend suite **285 passed / 98.31% cov**. DEVELOPMENT.md §3.9 records the accepted/deferred verdict verbatim (slug+index is safe for public media — readable, stable, no unpredictable-URL requirement; UUID immutable paths `cars/{car_id}/gallery/{uuid}.webp` deferred until slug reuse/renaming or storage isolation becomes necessary; no scheme change this phase).
- **Files touched**: backend/apps/cars/tests.py, DEVELOPMENT.md, CLAUDE.md
- **Decisions made**: keep `{slug}_gallery_{idx}` naming; do not start a storage migration or orphan-file cleanup now. The DB-level uniqueness of active slugs is the load-bearing guarantee, so the test asserts distinct filenames across distinct active cars rather than testing the index itself (that already exists as `test_slug_rejected_when_active_exists`).

---

### Session — 2026-09-05 — Font self-hosting (plan §6.J / §7 perf)
- **Goal**: Remove the last runtime dependency on fonts.googleapis.com by self-hosting Vazirmatn + Poppins via `next/font/local`, with Docker validation.
- **Done** (`07e72c8`):
  - Downloaded 10 woff2 files into `frontend/fonts/` — Vazirmatn weights 400–900 from the upstream repo (rastikerdar/vazirmatn `fonts/webfonts/`, via jsDelivr `gh/` mirror, ~51 KB each) and Poppins latin 500–800 from `@fontsource/poppins` files (~8 KB each, the same files Google Fonts serves). All verified wOFF2 magic + per-file HTTP 200.
  - New `frontend/lib/fonts.ts` declares both families with per-weight `src` arrays and CSS variables (`--font-vazirmatn`, `--font-poppins`), `display: swap`.
  - `app/layout.tsx`: the three Google `<link>` tags (preconnect ×2 + stylesheet) are DELETED; the font variables go on `<html lang="fa" dir="rtl">`. `globals.css`: the render-blocking Google `@import` (which sat AFTER the @tailwind directives — invalid CSS order, latent bug) is removed and `body` uses `var(--font-vazirmatn)`. `tailwind.config.ts`: `font-vazir`/`font-poppins` resolve through the CSS variables (next/font hashes the family names).
  - Verified in the built output (throwaway container): 10 hashed `/_next/static/media/*.woff2` emitted, 10 `rel=preload` tags on `/`, `@font-face` with `font-display:swap` per weight, **zero `fonts.googleapis` in any page HTML** (the remaining matches in server chunks are Next.js framework internals — its font-link check code — not page output). Live dev site after restart: 0 Google refs, font file fetch HTTP 200 same-origin.
- **Validation (Docker)**: backend untouched (**284 passed**); frontend **301 passed / 39 suites, zero act/console warnings**; `tsc` clean; **`npm run lint` now reports “No ESLint warnings or errors”** (the known Google-font warning is gone); `next build` green with unchanged sizes (`/` 107 kB first load).
- **Files touched**: frontend/lib/fonts.ts (new), frontend/fonts/vazirmatn/* (6 woff2, new), frontend/fonts/poppins/* (4 woff2, new), frontend/app/layout.tsx, frontend/app/globals.css, frontend/tailwind.config.ts, CLAUDE.md, DEVELOPMENT.md, README.md
- **In progress / Next steps**: Phase 6 (CSP headers, compose consolidation, ADRs, secret-scan CI) — note CSP will need `font-src 'self'` to match. Phase 2 cutover still gated on §3.6 staging smoke + owner approval. Optional: verify in a browser that Persian text renders in Vazirmatn on the deployed preview.
- **Decisions made**: `next/font/local` over plain `@font-face` (preload + hashed cache-busted filenames + the plan's §6.J wording, at the cost of moving 2 literal family-name references to CSS variables). All 6+4 weights kept for zero visual regression (each ~8–51 KB). Font files committed to the repo — they must be fetched once on a machine that can reach GitHub/jsDelivr, not at build time.

---

### Session — 2026-09-05 — Phase 5 (UI/a11y polish + measured perf)
- **Goal**: Complete Phase 5 of docs/SENIOR_REFACTOR_PLAN.md (§6.H/§6.I/§6.J) — UI consistency (real duplication only), accessibility (skip link, ConfirmDialog, focus management, reduced motion, table/status semantics), measured public-site performance — with Docker validation and conventional commits. Finish the in-flight focus-management work the previous agent left uncommitted.
- **Done** (commits on `develop`):
  - Phase 4 close-out already committed before this session: `b6b7e5c` (last-valid-page fallback + zero-act-warning suite), `57c74cc` (Phase 4 docs + SUPERSEDED banners), `4ff9b12` (refactor(ui): `SectionHead` from 5 copies, `CarCardImage` from 3, admin `PageHeader`/`ErrorState`/`EmptyState`; AdminListPage caption + `scope=col`), `2e48f43` (feat(a11y): skip link + `ConfirmDialog` replacing all five `window.confirm()` delete flows).
  - `feat(a11y): improve focus management and reduced-motion support` — new shared `useModalA11y` hook powers ConfirmDialog/MobileNav/CarFilters drawer/ConsultationModal (Escape, Tab trap, initial focus, focus return); closed drawers are `aria-hidden` + `visibility:hidden`. **Two bugs in the in-flight work fixed**: duplicate `role`/`aria-modal`/`aria-label` JSX attrs in CarFilters (TS compile error) and a TDZ `ReferenceError` in ConsultationModal (hook read `handleClose` before its `const`). Reduced motion: globals.css block extended (`.animate-slide-up`/`.animate-hero-zoom` kill + blanket `transition/animation-duration: 0.01ms`), HeroSlider JS autoplay pauses under `prefers-reduced-motion`. Status not color-only: `aria-pressed` on every admin status toggle (cars active/featured, branches, features, hero-slides, inquiries read/contacted); AdminListPage loading gets `role="status"`.
  - `test(a11y): cover keyboard and focus behavior` — 36 new/extended tests: ConfirmDialog (Escape/trap/focus-return/cancel/confirm), skip-link layout, reduced-motion CSS presence + HeroSlider autoplay, MobileNav/CarFilters/ConsultationModal keyboard+focus, AdminListPage caption/scope/status, branches aria-pressed. Frontend suite **265 → 301 passed, zero act warnings, zero console errors** (verified with grep on full `npm test` output).
  - `perf: record measured public baselines` + `docs(ui): Phase 5 validation` — `next build` green: `/` 107 kB first load, `/cars` 109 kB, `/cars/[slug]` 108 kB; curl evidence of SSR'd public HTML (47.8 kB at `/`). No image code change: media URLs already `unoptimized` (OptimizedImage); the local next/image optimizer ECONNREFUSED is dev-only and never affects page rendering (nginx same-origin). Fonts documented as deferred (no local font assets; `next/font/google` forbidden — build env can't reach Google Fonts; Google `@import`+`display=swap` retained).
- **Manual smoke (local Docker, same day)** — per DEVELOPMENT.md §9: seeded 26 cars → admin pagination verified through nginx (page1=20, page2=6, `?page=999`→404; no-CSRF POST→403; with-CSRF→400 with Persian field errors); car form gallery create (gallery_0/1 → 2 URLs) and edit-append (existing preserved + new appended, 3 URLs) via real multipart; duplicate-slug create surfaced an **unhandled IntegrityError 500** (fixed: 400 slug field error) and gallery edit-append **overwrote the first existing image's file** (fixed: filename counter continues past existing). Both pinned by new/extended pytest (backend now **284 passed / 98.30% cov**). Axe spot checks via headless Chrome + axe-core (jsdom): real findings fixed — filter selects unlabeled (critical select-name → aria-labels), footer `tel:` link empty when no phone (serious link-name → guarded), two unlabeled nav landmarks (→ desktop nav aria-label), heading skips (card h4/footer h5 → h3, home gained an sr-only h1); post-fix **0 violations** on hydrated `/`, `/cars`, detail (remaining = jsdom-incomplete visibility/streaming artifacts). DB restored to original 2 cars; smoke user/media/temp files removed.
- **Files touched**: frontend/components/ui/useModalA11y.ts (new), components/admin/ui/ConfirmDialog.tsx, components/car/{CarFilters,ConsultationModal}.tsx, components/layout/MobileNav.tsx, components/home/HeroSlider.tsx, app/globals.css, jest.setup.js (matchMedia mock), 5 admin entity pages (aria-pressed), AdminListPage.tsx, new tests (ConfirmDialog, skip-link layout, HeroSlider, reducedMotionCss, CarFilters, ConsultationModal), extended tests (MobileNav, AdminListPage, branches), README.md, DEVELOPMENT.md, CLAUDE.md
- **In progress / Next steps**: Phase 6 (CSP headers, compose consolidation, ADRs, secret-scan CI). Phase 2 cutover still gated on §3.6 staging smoke + owner approval. Font self-hosting pass (deferred). Before staging: re-verify car form in the browser (create/edit/save-with-server-400) since the API-level smoke passed but no browser automation exists for the admin pages.
- **Decisions made**: dialog/drawer focus behavior lives in ONE shared `useModalA11y` hook (not per-component copies); the hook's `onClose` is read through a ref so latest closures are used; ConsultationModal hook call placed after `handleClose` (TDZ-safe); closed overlays keep `aria-hidden` + `visibility:hidden` so they leave the tab order; native `.click()` in tests replaced with `fireEvent.click` (act-safe); fonts documented as deferred rather than adding binary assets/new deps mid-session.

---

### Session — 2026-09-05 — Phase 4 (admin correctness & reuse)
- **Goal**: Review Phase 3, then complete Phase 4 of docs/SENIOR_REFACTOR_PLAN.md (AdminListPage + pagination + stats endpoint + AdminForm split) to senior quality gates: fix the in-flight work's defects, add the missing test coverage, commit in green conventional commits, refresh docs.
- **Done** (6 commits on `develop`):
  - `a9b50d7` feat(admin): `GET /api/v1/admin/stats/` (staff-only, four SQL COUNTs) + `lib/api/stats.ts` + `AdminStats` type; dashboard now uses one call instead of four page-1 fetches. Inquiry count deliberately includes soft-deleted rows (`with_deleted()`) to match the admin inquiries list total; stale docstring fixed.
  - `b848429` refactor(forms): the 575-line `AdminForm.tsx` deleted, split into `form/useAdminForm.ts` (transport-free; load effect keyed on `loadId` — **fixed a real blocker: the inline `load: () => load(id)` arrow changed identity every render, so edit pages refetched in a loop and reverted user edits**), `form/fields.tsx` (per-type renderers; `fieldSpanClass` restored full-width behavior for named content fields including single-line inputs — features `description` had regressed to half width), `lib/api/formData.ts` (single home of multipart conventions). Entity modules own `saveX(values)`; 10 form pages keep byte-identical schemas. renderHook tests pin load-once/validation/field-error mapping.
  - `30a9299` feat(admin): shared `AdminListPage` — all six list pages; pagination from `count`/`page_size` envelope; empty-page→page-1 and 404→previous-page fallbacks; row-action `refresh`/`error` helpers; inquiries dead `statusButton` label params removed.
  - `277df0f` test(admin): `formData.test.ts` (gallery_0..N / boolean / null-skip contract), endpoints tests for stats + gallery keys, jest coverage scope now measures `components/admin/{form,list}`.
  - `4cd4f8a` test(cars): backend pins for the same contract — admin multipart create with `gallery_0/1`, PATCH preserves existing gallery URLs and appends, `catalog_file` via admin API, `?page=2` remainder + `page_size` envelope key, `?page=999` → 404.
  - Docs commit: README/DEVELOPMENT §3.8/CLAUDE.md refreshed; SUPERSEDED banners on ARCHITECTURE.md, IMPLEMENTATION_REPORT.md, FINAL_PRODUCTION_REPORT.md, PRODUCTION_READINESS_CHECKLIST.md, PRODUCTION_DEPLOYMENT_CHECKLIST.md (token-auth era — do not run its commands), STEP_BY_STEP_ROADMAP.md, agents/developer_car_feature_implementation.md; `.opencode/agents/developer.md` rewritten for session-cookie/lib-api-lib-data boundaries (it taught localStorage-token auth); devops.md + DEVELOP_RULES.md stale lines fixed; PHASE1 status table updated.
- **Validation (Docker, 2026-09-05)**: backend **283 passed / 98.29% cov** (was 275; scratch `backend/test_dbg{,2,3}.py` deleted — they were pytest-collected and 2 failed), frontend **265 passed** (was 209), tsc clean, lint clean (known Google-font warning only), `next build` green in a throwaway container.
- **In progress / Next steps**: Phase 5 (ConfirmDialog replaces `confirm()`, skip link, reduced motion); Phase 6 (CSP, compose consolidation, ADRs). Phase 2 cutover still gated on §3.6 staging smoke + owner approval. Optional manual smoke before staging: 25+ car paging, car form gallery create/edit/save-with-server-400.
- **Decisions made**: `useAdminForm` stays transport-free — `load` read through a ref, effect keyed on `loadId`, never on function identity. Settings page intentionally not migrated to the split (singleton PATCH + toast shape). Endpoint module changes (page param + save signature) landed with the form commit so every commit builds; test files pin the module they exercise in the same commit.
- **Post-review cleanup (same day, one commit)**: reviewer accepted Phase 4 with three conditions, all fixed — (1) `AdminListPage` empty-page fallback now lands on the LAST valid page computed from `count`/`page_size` (page 3 delete → page 2, not page 1; test re-pinned); (2) act() warnings eliminated in CarsExplorer/ArticlesExplorer/admin-layout tests by settling fetch→setState chains inside act (`flush()` helper + settled-UI assertions; admin-layout test now resolves the 401 bootstrap with a stubbed `window.location`); suite output is warning-free; (3) DEVELOPMENT.md npm-mirror troubleshooting corrected — both Dockerfiles use `registry.npmmirror.com`; the Arvan mirror must never be re-enabled locally. Plus trailing blank line removed from `lib/api/formData.ts`.

---

### Session — 2026-09-04 — Phase 3 (server/client boundary + routes)
- **Goal**: Implement Phase 3 of the Senior Refactor Plan — public content pages server-rendered, settings via RSC, URL-derived listing state, admin login outside the protected guard — with Docker validation.
- **Done**: Five commits on `develop`:
  - `194c031` refactor(routing): `(site)` route group for public pages; root layout minimal (html/body/fonts/metadata only); `admin/layout.tsx` is providers-only (AuthProvider); new `admin/(protected)/layout.tsx` guard+shell; `/admin/login` sits outside `(protected)` and still gets AuthProvider; pathname-based login exceptions removed from the guard.
  - `f2edb6a` refactor(settings): `lib/data/settings.ts` (server-only, `BACKEND_INTERNAL_URL`, revalidate 60, never throws → Persian defaults); `(site)/layout.tsx` server-fetches settings once and renders Header/Footer with typed props; SettingsContext deleted; home sections + Header/Footer + root not-found converted to prop/settings consumers.
  - `1e4c629` refactor(home): home page is a server component; `lib/data/home.ts` fetches hero slides/features/featured cars/latest articles/branches; sections became client islands receiving typed data as props (no mount fetch); server-rendered HTML contains real content.
  - `3ff66ad` refactor(cars) + Step A: `CarsExplorer`/`ArticlesExplorer` client islands derive ALL filter/search/sort/page state from `searchParams` (no useState mirrors, no URL↔state sync effects); interactions `router.replace`; transient state only for input typing/debounce, drawer, loading/error.
  - `32540cf` Step B: `/cars` and `/articles` are async server shells parsing `searchParams` with shared `parseCarListQuery`/`parseArticleListQuery`, fetching the matching first page + filter options server-side (`lib/data/car.ts`/`article.ts`), passing the snapshot to the island; island skips duplicate initial fetch when URL equals `initialQuery`.
  - `83a1379` fix(seo): detail pages use shared `getCarDetail`/`getArticleDetail` (retry/backoff + timeout + media normalization, previously inline-duplicated); missing entities call `notFound()` → root not-found renders public chrome; added `(site)/loading.tsx` + `(site)/error.tsx`; new `lib/data/__tests__/detail.test.ts`.
  - Architecture rules verified by grep: SettingsContext/useSettings = NONE; lib/data never imports lib/api and vice versa; no `/auth/session/` in any public app/component; no useState mirror of searchParams in explorers.
- **Validation (Docker, 2026-09-04)**: backend 275 passed / 97.73%; frontend 209 passed; tsc clean; lint clean (known Google-font warning only); `next build` green (public routes now `ƒ` dynamic, /home first-load 107 kB); public HTML curl evidence: `/cars` first HTML contains real card link (`href="/cars/tot-rav"`), `/cars?brand=Toyota` shows the empty state (local DB brand is `tot`), detail 200 with content, unknown slug → root not-found.
- **Files touched**: frontend/app (route groups, shells, detail pages, loading/error/not-found), frontend/app/admin/(protected), frontend/components/{layout,home,site}, frontend/lib/data/{settings,home,car,article,request,media}.ts + tests, README.md, DEVELOPMENT.md, CLAUDE.md
- **In progress / Next steps**: Phase 4 (AdminListPage + pagination + stats endpoint; AdminForm split). Phase 2 cutover (TokenAuthentication removal) still gated on staging smoke + owner approval.
- **Decisions made**: `(site)` + `admin/(protected)` with providers-only admin layout (login shares AuthProvider with protected shell, guard one level deeper). URL is the single source of truth for listing state; server snapshot + `initialQuery` comparison avoids duplicate island fetch. lib/data is strictly server-only; lib/api strictly browser-only.

---

### Session — 2026-09-04 — Local browser smoke test + dev env fixes
- **Goal**: Full browser-based Phase 2 smoke test on local Docker; fix whatever surfaces.
- **Done**: Diagnosed two dev-environment problems that had nothing to do with the auth code:
  1. **Stale client chunks**: the dev `frontend` container's `.next` anonymous volume survived rebuilds, and Docker Desktop on Windows does not reliably deliver fs events into containers, so `next dev` served an OLD compiled `app/admin/layout.tsx` (direct `useAuth`) against the NEW root layout (no provider) → `useAuth must be used within an AuthProvider` only in the regular browser profile; incognito was fine. Fix: purge the `.next` volume (stop container → `docker compose rm -f frontend` → `docker volume rm <anon .next volume>` → `docker compose up -d frontend`).
  2. **CORS on admin login**: the dev image baked `NEXT_PUBLIC_API_URL=https://rahnavard.co/api/v1` (Dockerfile ARG default from the original scaffold), so admin client calls (http.ts `API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'`) went cross-origin to PRODUCTION → CORS errors on `/auth/login/` and `/auth/session/`. The compose `environment` only overrode SITE_URL. Fix (both local-only files): `frontend/Dockerfile` dev ARG/ENV defaults → `NEXT_PUBLIC_API_URL=/api/v1`, `NEXT_PUBLIC_SITE_URL=http://localhost` (same relative-URL approach as Dockerfile.prod — the local nginx proxy routes `/api/*` → backend); `docker-compose.yml` frontend.environment now also sets `NEXT_PUBLIC_API_URL=/api/v1` so an old image cannot bake a wrong value. Verified by curl through nginx: bootstrap 401 → login 200 (sessionid httpOnly + csrftoken cookies) → session restore 200 → admin branches 200 → POST without CSRF 403 → with CSRF 400 (validation) → logout 200 → session 401. Zero `rahnavard.co/api` references remain in compiled admin chunks.
  - Also observed: local next/image optimizer 500s (ECONNREFUSED fetching `http://localhost/media` from inside the frontend container) — dev-only, separate from auth; and a transient Next dev `loadManifest` JSON race on a fresh `.next` (retry clears it).
- **Files touched**: frontend/Dockerfile, docker-compose.yml, CLAUDE.md
- **In progress / Next steps**: user re-runs the browser smoke (login/persistence/CRUD/public form/logout) in incognito or after closing old localhost tabs; TokenAuthentication removal still gated on staging smoke + owner approval.
- **Decisions made**: Local dev API base is RELATIVE `/api/v1` (never absolute); image ARG defaults and compose environment must agree so a stale image can't reintroduce the cross-origin bug. When env/Dockerfile changes affect inlined NEXT_PUBLIC_* values, recreate the container (fresh `.next`) — env changes alone do not invalidate compiled chunks.

---

### Session — 2026-09-04 — Phase 2 review fixes
- **Goal**: Apply the three final Phase 2 review fixes (public-site auth regression, dual-mode logout token handling, deferred token purge) and make the full local Docker build work.
- **Done**:
  - Fix 1 — **AuthProvider moved from the root layout into `app/admin/layout.tsx`** (wrapped via a new `AdminShell` inner component). Public pages no longer call `/auth/session/` and anonymous visitors are never redirected to `/admin/login`. `SettingsProvider` stays in the root layout. No route groups yet (Phase 3). New tests: root-layout tests render into a full jsdom `Document` via `createRoot` (an `<html>` root can't go in RTL's `<div>`); admin-layout tests cover the 401 redirect and authenticated render.
  - Fix 2 — **backend logout branches on the actual authenticator**: `SessionAuthentication` → destroy session only, PRESERVE the legacy DRF token; token-authenticated (`request.auth` is a `Token`) → delete the presented token. Learned DRF internals: `force_authenticate()` swaps in an internal `ForcedAuthentication` (so `successful_authenticator` is neither Token nor Session), and the reliable signal is `isinstance(request.auth, Token)`. The old `except Exception` catch is gone.
  - Fix 3 — **removed the automatic `localStorage.removeItem('admin_token')` purge** from AuthContext (left only as a TODO for the cutover commit); http.ts comment updated; AuthContext tests now assert NO localStorage get/set/remove during bootstrap/login/logout.
  - Docker — **local `frontend/Dockerfile` registry switched from Arvan (`npm.arvancloud.ir`, 403s outside Iran) to the China mirror `registry.npmmirror.com`** (same as Dockerfile.prod). This file is local-only (LOCAL_ONLY_FILES.txt) — `docker compose up --build -d` now works end-to-end locally.
  - Docs: README (dual-mode rollback details), DEVELOPMENT.md §3.6 smoke checklist updated (public-page no-redirect check, token-preserving logout, key-left-untouched), CLAUDE.md numbers.
- **Files touched**: frontend/app/layout.tsx, frontend/app/admin/layout.tsx, frontend/contexts/AuthContext.tsx, frontend/lib/api/http.ts (comment), backend/apps/accounts/views.py, backend/apps/accounts/test_session_auth.py, frontend/app/__tests__/layout.test.tsx (new), frontend/app/admin/__tests__/layout.test.tsx (new), frontend/contexts/__tests__/AuthContext.test.tsx, frontend/Dockerfile, README.md, DEVELOPMENT.md, CLAUDE.md
- **In progress / Next steps**: TokenAuthentication removal STILL requires staging smoke (DEVELOPMENT.md §3.6) + explicit owner approval. Phase 3 route groups will formalize the admin/(protected) boundary (AuthProvider already admin-scoped early).
- **Decisions made**: Early admin-scoping of auth is a targeted Phase 2 fix, not Phase 3 completion. Purge deferred by design. Logout semantics: branch on the presented credential, never on token existence in the DB.

---

### Session — 2026-09-04 — Phase 2 (auth)
- **Goal**: Implement Phase 2 of the Senior Refactor Plan — dual-mode Django session authentication + CSRF, frontend session-cookie switch, Docker verification, docs. NO TokenAuthentication removal (gated on owner approval after staging smoke).
- **Done**:
  - Backend: `TokenAuthentication` kept FIRST + `SessionAuthentication` SECOND in REST_FRAMEWORK (order is load-bearing); 8h `SESSION_COOKIE_AGE`; login calls `django.contrib.auth.login()` + `@ensure_csrf_cookie` while still returning `{token, user}` (dual-mode); new `GET /api/v1/auth/session/` (ensure_csrf_cookie, returns user or 401); logout destroys session + token; inquiry POST view now `authentication_classes = []` so a logged-in admin submitting the public form never needs CSRF. Dev `backend/Dockerfile` now installs `requirements-dev.txt` at build time (Docker is the supported test env; `Dockerfile.prod` untouched).
  - Tests: `backend/apps/accounts/test_session_auth.py` — login sets session+CSRF cookie, session restore + 401, session-authenticated unsafe write WITHOUT CSRF → 403 and WITH `X-CSRFToken` → success (clients built with `enforce_csrf_checks=True` + `secure=True`; DRF `APIClient` drops `secure` so Django's `Client` is used), legacy `Authorization: Token` still works under CSRF enforcement (token authenticator short-circuits before DRF CSRF), logout destroys session, public inquiry POST while logged-in returns 201 without CSRF, non-admin forbidden.
  - Frontend: `lib/api/http.ts` never sends `Authorization`, never reads localStorage; forwards `X-CSRFToken` from the `csrftoken` cookie on unsafe methods; 401 → `/admin/login` redirect kept. `AuthContext` bootstraps via `GET /auth/session/`, login/logout through session endpoints, one-time `removeItem('admin_token')` purge only (never reads/writes credentials); legacy dual-mode `token` in login response is deliberately ignored. Tests rewritten for session model (incl. absence of localStorage writes). `jest.setup.js` localStorage mock fixed with `Object.defineProperty` (plain `global.localStorage =` is silently ignored by jsdom → spyOn failed on real Storage).
- **Files touched**: backend/config/settings.py, backend/apps/accounts/{views,urls,tests,test_session_auth}.py, backend/apps/inquiries/views.py, backend/Dockerfile, frontend/lib/api/{http,auth}.ts, frontend/contexts/AuthContext.tsx + tests, frontend/lib/api/__tests__/{http,endpoints}.test.ts, frontend/jest.setup.js, README.md, DEVELOPMENT.md, CLAUDE.md
- **In progress / Next steps**: STAGING SMOKE TEST + owner approval before removing TokenAuthentication/localStorage remnants (see DEVELOPMENT.md §3.6 checklist). Production cutover is a deliberate, owner-authorized merge — note `LOCAL_ONLY_FILES.txt` still lists `backend/config/settings.py` (stale: throttle rates are committed on both branches now), so prepare-merge.sh will revert settings.py before a main merge; the cutover must handle that explicitly. Frontend npm-install image rebuilds currently fail outside Iran (Arvan mirror 403) — only rebuild the `backend` image locally.
- **Decisions made**: Keep dual-mode until explicit cutover approval (rollback = reorder/remove SessionAuthentication + frontend revert). CSRF-enforcement tests must use Django `Client(enforce_csrf_checks=True)` over HTTPS — DRF `APIClient` doesn't forward `secure`. No change to TokenAuthentication/authtoken yet.

---

### Session — 2026-09-04
- **Goal**: Finish/harden Phases 0–1 of the Senior Refactor Plan (docs/SENIOR_REFACTOR_PLAN.md), then re-commit without the Codebuff attribution footer, and verify the entire workflow on local Docker
- **Done**:
  - Reviewed every uncommitted Phase 0/1 change against the plan; fixed all frontend test warnings (act() in ConsultationForm tests, `window.scrollTo` mock, next/image mock prop stripping, `pageSize` exhaustive-deps in cars/articles listing pages)
  - Hardened http.ts envelope tests (non_field_errors, plain-string field errors); documented AuthContext's intentional empty logout catch; removed `any` in admin login catch
  - Confirmed zero app imports of deleted `authFetch`/old `lib/api`/`withAuth`; admin error handling surfaces inline banners (no silent catches)
  - Docs: README gained a "Refactor Status" section; root PHASE1_IMPLEMENTATION_COMPLETE.md rewritten as SUPERSEDED (it is gitignored/untracked — on-disk fix only)
  - Committed 7 conventional commits on `develop` (backend sanitizer + backfill; duplicate InquiryCreateView removal; frontend/types + lib/api + lib/data layers; admin migration + legacy client deletion; public pages shared types; test hygiene; docs). The user then asked to redo these commits WITHOUT the Codebuff/Co-Authored-By footer — done via `git reset 7abc119` + recommit (same messages/boundaries, clean attribution, no content change; old hashes 18304f4…0c8c0b1 → new c1ebd46…f14ed99)
  - **Verified the whole suite inside local Docker** (see §1 docker block): backend 258 passed / 97.72%, frontend 187 passed, tsc/lint/next build clean
- **Files touched**: backend sanitizer/migrations/tests, frontend types/, lib/api/, lib/data/, admin pages, public components, jest.setup.js, README.md, CLAUDE.md, DEVELOPMENT.md, DEVELOP_RULES.md
- **In progress / Next steps**: Phase 2 auth cutover (session cookies + CSRF, remove TokenAuthentication) per plan §7 — token/localStorage auth remains intentional until then; backfill preview/apply on production before the deploy that runs migrations 0008/0005
- **Decisions made**: (1) Owner convention — ALL verification runs on local Docker via `docker compose exec` (documented in §1); never `next/font/google` (prod builds blocked from Google Fonts); (2) owner wants commits authored without the Codebuff footer going forward

---

### Session — 2026-09-02
- **Goal**: Add cross-session memory mechanism to project
- **Done**: Added Session History section (Section 17) to CLAUDE.md so future AI sessions can recall past work
- **Files touched**: CLAUDE.md
- **In progress / Next steps**: Populate this log with prior session summaries (see below)
- **Decisions made**: Use reverse-chronological format in CLAUDE.md as the single source of session memory

---

### Prior Session Summaries (Reconstructed from Git Log)

These are inferred from commit history since no prior session logs existed.

#### Phase 1 — Initial Setup (2026-08-17 to 2026-08-20)
- **Goal**: Scaffold full-stack Next.js + Django application
- **Done**: Project init, Docker setup, Nginx config, Arvan Cloud deployment, CI/CD pipeline, Django models & migrations, admin panel with auth, home page with all sections
- **Key features built**: Hero slider, Why Rahnavard, Featured Cars, Consultation Form, Branches, Latest Articles, Footer, Header
- **Backend apps**: core, cars, articles, branches, inquiries, accounts

#### Phase 2 — Bug Fixes & Deployment Hardening (2026-08-20 to 2026-08-27)
- **Goal**: Fix production issues and stabilize deployment
- **Done**: SSL redirect fixes, CSRF fix, health check improvements, deploy script hardening, image 400 fixes, slug migrations, local-only files system, admin CRUD for all entities
- **Key issue**: Local-only Docker dev files kept leaking into production — solved with stash-based merge workflow

#### Phase 3 — Car Listing & UI Polish (2026-08-28 to 2026-09-01)
- **Goal**: Build /cars listing page and fix UI issues
- **Done**: Car listing page with URL state management, filtering/search/ordering/pagination, car listing components + tests, header solid bg fix, hero slider link hover, PDF viewer fix, image loading fixes
- **Files touched**: app/cars/page.tsx, components/car/*, components/admin/*, frontend/lib/*
- **In progress**: Pending features — articles page, more admin CRUD, additional tests

---

*Last updated: 2026-09-05 (CSP enforced + Phase 2 cutover complete — session-only auth, admin_token purged; backend 282, frontend 302, e2e 13)*
