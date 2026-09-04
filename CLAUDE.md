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
docker compose exec -T backend python -m pytest -q          # 275 passed, ~98% cov (2026-09-04)
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py makemigrations --check --dry-run
# pytest uses config.test_settings → SQLite :memory: (no Postgres needed for tests)

# Frontend — all tooling (jest/tsc/eslint/next) is installed in the image.
# The LOCAL dev frontend/Dockerfile uses the China npm mirror
# (registry.npmmirror.com) — the Arvan mirror (npm.arvancloud.ir) 403s outside
# Iran — so `docker compose up --build` works locally.
docker compose exec -T frontend npm test -- --runInBand      # 189 passed (2026-09-04)
docker compose exec -T frontend npx tsc --noEmit
docker compose exec -T frontend npm run lint
# Production build in a throwaway container so the running dev server's .next
# volume is never touched:
docker compose run --rm --no-deps frontend npm run build
```

Verified green inside Docker on 2026-09-04 (backend 275 passed / 97.73% cov,
frontend 189 passed, tsc clean, lint clean except the known Google-font `<link>`
warning in `app/layout.tsx` — do NOT switch to `next/font/google`: prod images are
built on a server where Google Fonts is blocked, see plan §J).

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

*Last updated: 2026-09-04 (Phase 0/1 hardened + committed; Docker verification workflow documented)*
