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

## 3. URL Conventions

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

## 4. Authentication & Session Handling

Session-only admin auth ([docs/adr/0001](docs/adr/0001-session-cookie-auth-for-admin.md)).
`TokenAuthentication` and `rest_framework.authtoken` were removed at the
2026-09-05 cutover — the guidance below is the ONLY auth model.

### How it works
1. `POST /api/v1/auth/login/` with credentials → Django sets an httpOnly
   `sessionid` cookie (SameSite=Lax) plus a deliberately readable
   `csrftoken` cookie. The response body is exactly `{user}` — no token
   is minted anywhere.
2. Admin API calls authenticate via the session cookie. Unsafe methods
   (POST/PUT/PATCH/DELETE) must echo `csrftoken` as the `X-CSRFToken`
   header — DRF `SessionAuthentication` enforces CSRF.
3. `AuthProvider` is mounted only under `app/admin`; public pages never
   call `/auth/session/`.
4. A stale `localStorage['admin_token']` key from the token era is purged
   exactly once on the first admin bootstrap.

### Frontend rules
- Never store auth material in localStorage; never send an
  `Authorization` header; never read `sessionid` (it is httpOnly).
- Send `X-CSRFToken` on unsafe requests — handled centrally in
  `lib/api`, not per-call.
- Unauthenticated requests to protected endpoints answer **403** (no 401
  challenge exists since TokenAuthentication died). On 403 at the admin
  guard, redirect to `/admin/login`.

### Protected endpoints
```python
class AdminView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
```


## 5. Environment Variables

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

## 6. Branching Strategy

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

## 7. Docker & Deployment

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

## 8. Database & Migrations

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

## 9. Component Architecture

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

## 10. API Response Format

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

## 11. Image Handling

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

## 12. Common Pitfalls to Avoid

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

## 13. File Structure

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
│   ├── contexts/               # AuthProvider (scoped to /admin)
│   ├── lib/api/                # Typed browser API client (admin)
│   └── lib/data/               # RSC-only data layer (public)
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

## 14. Testing Checklist

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

## 15. Deployment Checklist

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

## 16. Emergency Commands

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

## 17. Contact & Support

- **Repository**: github.com/sinahmd/rahnavard
- **Domain**: rahnavard.co
- **Server**: Arvan Cloud

---

## 18. Session History

Cross-session agent memory lives in `CLAUDE.local.md` — gitignored,
local-only. This file intentionally carries no session log.
