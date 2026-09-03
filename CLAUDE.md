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

### Backend Tests (pytest)
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

### Frontend Tests (Jest + React Testing Library)
```bash
cd frontend
npm test                      # Run all tests
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

*Last updated: 2026-09-03 (ci test)*
