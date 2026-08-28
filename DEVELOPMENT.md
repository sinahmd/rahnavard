# Rahnavard — Development Workflow

> **Branching strategy, local development, and deployment flow.**
> Read this before making any changes.

---

## 1. Branch Overview

```
main ──────────────────────────────────────────── Production (rahnavard.co)
  ↑ merge PR
develop ────────────────────────────────────────── Local dev & staging
  ↑ work here
feature/* ──────────────────────────────────────── Individual features
```

| Branch | Purpose | CI Runs | Deploys? |
|--------|---------|---------|----------|
| `main` | Production-ready code | ✅ Lint + Test + Build | ✅ Auto-deploys to Arvan Cloud |
| `develop` | Integration branch for local testing | ✅ Lint + Test + Build | ❌ No deploy |
| `feature/*` | Individual features (optional) | ✅ On PR to main | ❌ No deploy |

---

## 2. Day-to-Day Workflow

### 2.1 Start working on a new feature

```bash
# Make sure you're up to date
git checkout develop
git pull origin develop

# Create a feature branch (optional but recommended for bigger features)
git checkout -b feature/my-new-feature

# Or work directly on develop for small changes
```

### 2.2 Make your changes

```bash
# Work on your feature...
# Run checks frequently:
cd frontend && npm run lint && npx tsc --noEmit
cd backend && python manage.py check
```

### 2.3 Commit your changes

```bash
git add .
git commit -m "descriptive commit message"
```

**Commit message format:**
```
<type>: <short description>

<optional body explaining WHY>

Examples:
feat: add car comparison tool
fix: slider not auto-playing on mobile
refactor: extract API helpers into lib/
docs: update deployment checklist
test: add tests for article CRUD
```

### 2.4 Push to develop (or your feature branch)

```bash
# If on develop:
git push origin develop

# If on a feature branch:
git push origin feature/my-new-feature
# Then open a Pull Request → develop
```

### 2.5 Merge to main & deploy

When develop is stable and ready for production:

```bash
# Option A: GitHub Pull Request (recommended)
# 1. Open PR: develop → main
# 2. Wait for CI to pass
# 3. Review changes
# 4. Merge
# 5. Deploy auto-triggers

# Option B: Command line
git checkout main
git merge develop
git push origin main
# Deploy auto-triggers
```

---

## 3. Local Development Setup

### 3.1 First time setup

```bash
git clone <repo-url>
cd rahnavard
git checkout develop

# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# Start everything
docker compose up --build
```

### 3.2 Access points

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Next.js dev server |
| Backend API | http://localhost:8000/api/v1/ | Django REST API |
| Django Admin | http://localhost:8000/django-admin/ | Superuser access |
| PostgreSQL | localhost:5432 | User: `user`, Pass: `pass` |

### 3.3 Hot Reloading — Changes Appear Instantly

Your Docker setup uses **volume mounts**, which means your local files are synced into the containers in real-time:

```yaml
volumes:
  - ./frontend:/app    # Local files → container
  - ./backend:/app     # Local files → container
```

**What updates IMMEDIATELY (no rebuild needed):**
| Change Type | Frontend | Backend |
|-------------|----------|---------|
| Edit `.tsx` / `.ts` / `.js` files | ✅ Instant (Next.js HMR) | — |
| Edit `.css` / Tailwind classes | ✅ Instant | — |
| Edit `.py` files | — | ✅ Instant (Django auto-reload) |
| Edit API serializer / views | — | ✅ Instant |

**What REQUIRES a rebuild:**
| Change Type | Command |
|-------------|---------|
| Add new npm package | `docker compose exec frontend npm install <pkg>` |
| Change `Dockerfile` | `docker compose up --build` |
| Add new Python package | `docker compose exec backend pip install <pkg>` |
| Change `.env` files | `docker compose restart` |

### 3.4 Useful commands

```bash
# Start / stop
docker compose up --build          # Start with rebuild
docker compose down                # Stop all
docker compose restart backend     # Restart one service

# Database
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell

# Frontend
cd frontend && npm run dev         # Start dev server
cd frontend && npm test            # Run tests
cd frontend && npm run lint        # Lint check

# Backend
cd backend && pytest               # Run tests
cd backend && python manage.py check  # Django checks
```

---

## 4. Pre-Commit Checklist

Before committing **any** changes, verify:

### Frontend
```bash
cd frontend
npm run lint           # ✅ No lint errors
npx tsc --noEmit       # ✅ No type errors
npm test               # ✅ All tests pass
```

### Backend
```bash
cd backend
python manage.py check                    # ✅ Django checks pass
python manage.py makemigrations --check   # ✅ No missing migrations
pytest                                    # ✅ All tests pass
```

### General
- [ ] No `console.log` left in code
- [ ] No hardcoded secrets or API keys
- [ ] All API calls use correct URL patterns (`/api/v1/...`)
- [ ] New model fields have `verbose_name`
- [ ] New models have migrations committed
- [ ] Commit message is descriptive

---

## 5. CI/CD Pipeline

### What runs on every push/PR:

```
Push to develop or main
    ↓
lint-frontend + lint-backend (parallel)
    ↓
test-frontend + test-backend (parallel)
    ↓
build-check (frontend build + backend check)
```

### What triggers deployment:

```
Push/merge to main  →  auto-deploys to rahnavard.co
Manual trigger      →  GitHub Actions → "Deploy to Production"
```

### What does NOT deploy:
- Pushes to `develop` (CI only, no deploy)
- Feature branches (CI only, no deploy)
- Pull requests (CI only, no deploy)

---

## 6. Feature Branch Naming

Use descriptive names with a prefix:

| Prefix | Use for |
|--------|---------|
| `feature/` | New features (e.g., `feature/car-comparison`) |
| `fix/` | Bug fixes (e.g., `fix/slider-mobile-layout`) |
| `refactor/` | Code refactoring (e.g., `refactor/api-helpers`) |
| `docs/` | Documentation (e.g., `docs/api-reference`) |
| `test/` | Adding tests (e.g., `test/article-crud`) |
| `chore/` | Maintenance (e.g., `chore/update-dependencies`) |

---

## 7. Full Merge Workflow (develop → main → develop)

> **This is the exact process for merging features to production and getting back to local dev.**

### Overview

```
develop (with local-only changes)
    ↓
Step 1: Revert local-only changes
    ↓
Step 2: Commit revert
    ↓
Step 3: git checkout main
    ↓
Step 4: git merge develop (fast-forward)
    ↓
Step 5: git push origin main (triggers deploy)
    ↓
Step 6: git checkout develop
    ↓
Step 7: git merge main (sync)
    ↓
Step 8: Re-apply local-only changes
    ↓
Step 9: git push origin develop
    ↓
develop ready for local dev again
```

---

### Step-by-Step Commands

#### Step 1: Make sure you're on develop and up to date
```bash
git checkout develop
git pull origin develop
```

#### Step 2: Run final checks
```bash
# Backend
cd backend && python manage.py check && pytest --no-cov

# Frontend
cd frontend && npm run lint && npx tsc --noEmit
```

#### Step 3: Revert local-only changes

See [Section 11](#11-local-only-changes-develop-branch) for exact files.

```bash
# Revert Dockerfile (restore Arvan npm mirror)
# Edit frontend/Dockerfile — uncomment the mirror line

# Revert authFetch.ts (restore relative URLs)
# Edit frontend/lib/authFetch.ts — remove API_BASE and fullUrl
```

#### Step 4: Commit the revert
```bash
git add frontend/Dockerfile frontend/lib/authFetch.ts
git commit -m "revert: restore local-only changes for production merge"
```

#### Step 5: Switch to main and merge
```bash
git checkout main
git merge develop --no-edit
```

#### Step 6: Push main (triggers deploy)
```bash
git push origin main
# → GitHub Actions runs CI
# → If CI passes, deploy triggers
# → rahnavard.co updates in ~2-3 minutes
```

#### Step 7: Switch back to develop
```bash
git checkout develop
```

#### Step 8: Sync develop with main
```bash
git merge main --no-edit
# Usually "Already up to date" if only local-only changes were reverted
```

#### Step 9: Re-apply local-only changes

```bash
# Re-apply Dockerfile change (remove Arvan mirror for local dev)
# Edit frontend/Dockerfile — remove the mirror line again

# Re-apply authFetch change (use NEXT_PUBLIC_API_URL)
# Edit frontend/lib/authFetch.ts — add API_BASE and fullUrl
```

#### Step 10: Commit and push
```bash
git add frontend/Dockerfile frontend/lib/authFetch.ts
git commit -m "chore: re-apply local-only changes for Docker dev"
git push origin develop
```

---

### Quick Reference (Copy-Paste)

```bash
# === MERGE TO PRODUCTION ===
git checkout develop && git pull origin develop
# [revert local-only changes]
git add frontend/Dockerfile frontend/lib/authFetch.ts
git commit -m "revert: restore local-only changes for production merge"
git checkout main && git merge develop --no-edit && git push origin main

# === BACK TO LOCAL DEV ===
git checkout develop && git merge main --no-edit
# [re-apply local-only changes]
git add frontend/Dockerfile frontend/lib/authFetch.ts
git commit -m "chore: re-apply local-only changes for Docker dev"
git push origin develop
```

---

### What Happens After Each Step

| Step | What Happens | Risk |
|------|-------------|------|
| Revert local-only | Code matches production | 🟢 None |
| Push main | GitHub Actions CI runs | 🟢 None |
| CI passes | Deploy auto-triggers | 🟢 None |
| Deploy completes | rahnavard.co updated | 🟢 None |
| Back to develop | Local dev resumes | 🟢 None |
| Re-apply local-only | Docker works locally again | 🟢 None |

---

## 8. Troubleshooting

### "My tests pass locally but fail in CI"
- Check if you're using the right Node/Python versions
- CI uses: Node 20, Python 3.11, PostgreSQL 16

### "Deploy failed after merge to main"
```bash
# Check deploy logs on GitHub Actions
# SSH to server and check:
cd /var/www/rahnavard
docker compose -f docker-compose.prod.yml logs backend
```

### "Docker build is slow"
```bash
# Use cached build (default):
docker compose build

# Force rebuild without cache:
docker compose build --no-cache
```

### "npm install fails with 403 Forbidden (npm mirror)"

The frontend Dockerfiles use npm mirrors for faster installs. Each Dockerfile has a **different** mirror:

| File | Mirror | Used by |
|------|--------|----------|
| `frontend/Dockerfile` | `npm.arvancloud.ir` (Iran) | Local dev | 
| `frontend/Dockerfile.prod` | `registry.npmmirror.com` (China) | Production (Arvan Cloud) |

**If you're outside Iran**, the Arvan mirror may return 403 Forbidden:
```
npm error 403 403 Forbidden - GET https://npm.arvancloud.ir/yocto-queue/-/yocto-queue-0.1.0.tgz
```

**Fix for local development:** Remove or comment out the line in `frontend/Dockerfile`:

```dockerfile
# RUN npm config set registry https://npm.arvancloud.ir/
```

> ⚠️ **Do NOT change `frontend/Dockerfile.prod`** — the production server uses `registry.npmmirror.com` and it works fine from Arvan Cloud. This fix is only for your local `Dockerfile`.

### "I accidentally committed to main"
```bash
# Move the commit to develop
git checkout develop
git cherry-pick <commit-hash>

# Then revert on main
git checkout main
git revert <commit-hash>
git push origin main
```

---

## 9. Important Rules

1. **Never force-push to `main`** — it breaks the deploy pipeline
2. **Never commit `.env` files** — they contain secrets
3. **Always run tests before pushing** — CI will catch it, but save time
4. **Keep commits atomic** — one logical change per commit
5. **Write descriptive commit messages** — future-you will thank you
6. **Merge, don't squash, into main** — preserves feature branch history
7. **Update this document** — when workflow changes, update it here

---

## 10. Current Project State (MVP as of August 2026)

### What's built and working:
- ✅ Home page with hero slider, featured cars, articles, branches, consultation form
- ✅ Cars listing and detail pages (redesigned with interactive gallery, specs grid, price card)
- ✅ Articles listing and detail pages
- ✅ Full admin panel (CRUD for all entities)
- ✅ Car admin: gallery/slider image upload, catalog file upload, soft delete/restore
- ✅ Token-based authentication
- ✅ SEO: metadata, sitemap, robots.txt, Schema.org
- ✅ Docker development + production setup
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Mobile responsive (hamburger menu, hero slider)
- ✅ PDF viewer component with download and fullscreen
- ✅ Tabs component (reusable)
- ✅ Image gallery with lightbox, keyboard navigation, thumbnails
- ✅ Related cars slider

### What needs development:
- 🔲 Car comparison tool
- 🔲 Search/filter functionality
- 🔲 Pagination on listing pages
- 🔲 Contact page
- 🔲 About page
- 🔲 Email notifications for inquiries
- 🔲 Admin dashboard analytics
- 🔲 Multi-language support (EN version)
- 🔲 Performance optimization (caching, CDN)
- 🔲 Accessibility audit and fixes

---

## 11. Local-Only Changes (develop branch)

> ⚠️ **These changes exist ONLY on `develop` and should NOT be merged to `main`.**
> They are for local development convenience only.

### Why local-only changes exist

In production, nginx proxies `/api/*` → backend. All client-side `fetch('/api/v1/...')` calls work because nginx forwards them. In local Docker dev, there's no nginx proxy — the Next.js dev server on port 3000 doesn't know about Django on port 8000. Local-only changes bridge this gap.

### Files table

| File | Change | Reason | Merge to main? |
|------|--------|--------|----------------|
| `frontend/Dockerfile` | Removed `npm.arvancloud.ir` mirror | Mirror returns 403 outside Iran | ❌ No |
| `frontend/lib/authFetch.ts` | Uses `NEXT_PUBLIC_API_URL` (stripped of `/api/v1`) for admin API calls | No nginx in local dev, admin auth calls need full backend URL | ❌ No |
| `frontend/lib/apiUrl.ts` | **NEW** — Helper to build full API URLs for client-side fetch calls | Client components use `apiUrl('/api/v1/...')` instead of relative `/api/v1/...` to reach Django directly | ❌ No |
| `frontend/contexts/SettingsContext.tsx` | Uses `apiUrl()` for settings fetch | Same as above | ❌ No |
| `frontend/components/home/FeaturedCars.tsx` | Uses `apiUrl()` for cars fetch | Same as above | ❌ No |
| `frontend/components/home/HeroSlider.tsx` | Uses `apiUrl()` for hero slides fetch | Same as above | ❌ No |
| `frontend/components/home/LatestArticles.tsx` | Uses `apiUrl()` for articles fetch | Same as above | ❌ No |
| `frontend/components/home/WhyRahnavard.tsx` | Uses `apiUrl()` for why-features fetch | Same as above | ❌ No |
| `frontend/components/home/Branches.tsx` | Uses `apiUrl()` for branches fetch | Same as above | ❌ No |
| `frontend/components/home/ConsultationForm.tsx` | Uses `apiUrl()` for inquiries POST | Same as above | ❌ No |
| `frontend/components/car/RelatedCarsSlider.tsx` | Uses `apiUrl()` for related cars fetch | Same as above | ❌ No |
| `frontend/components/car/CarImageGallery.tsx` | **NEW** — Uses `apiUrl()` to resolve `/media/` URLs to full backend URL | SSR needs absolute URLs for media in local dev (no nginx proxy) | ❌ No |
| `frontend/app/cars/[slug]/page.tsx` | Contains `resolveMediaUrl()` helper function | Server component resolves `/media/` URLs to absolute for SSR in local dev | ❌ No |
| `frontend/components/ui/OptimizedImage.tsx` | Marks `http://localhost:8000/media/` as unoptimized | Docker image optimizer can't reach localhost:8000 inside container | ❌ No |
| `frontend/next.config.js` | Added `backend:8000` to `images.remotePatterns` | Allows Next.js image optimizer to fetch from Docker backend container | ❌ No |
| `backend/config/settings.py` | Increased throttle rates in DEBUG mode (`10000/hour`) | Local dev needs higher rate limit for testing | ❌ No |
| `frontend/.dockerignore` | Created | Speeds up local Docker builds | ✅ Yes |
| `backend/.dockerignore` | Created | Speeds up local Docker builds | ✅ Yes |
| `backend/apps/core/mixins.py` | Created `SoftDeleteMixin` | Data safety feature | ✅ Yes |
| `backend/apps/*/models.py` | Added soft delete fields | Data safety feature | ✅ Yes |
| `backend/apps/*/views.py` | Admin views use `with_deleted()` | Admin needs to see deleted items | ✅ Yes |
| `backend/apps/*/serializers.py` | Added `is_deleted` to admin serializers | Admin restore functionality | ✅ Yes |
| `backend/apps/*/admin.py` | Added restore/delete actions | Admin UI improvement | ✅ Yes |
| `frontend/components/car/CarImageGallery.tsx` | **NEW** — Interactive image gallery with lightbox | Car detail page redesign (feature) | ✅ Yes |
| `frontend/components/car/PdfViewer.tsx` | **NEW** — PDF viewer with download/fullscreen | Car detail page feature | ✅ Yes |
| `frontend/components/admin/GalleryUpload.tsx` | **NEW** — Multi-file gallery upload with drag & drop | Admin car gallery management | ✅ Yes |
| `frontend/components/admin/FileUpload.tsx` | **NEW** — File upload component | Admin form reusability | ✅ Yes |
| `frontend/components/ui/Tabs.tsx` | **NEW** — Reusable tab component | UI component library | ✅ Yes |
| `frontend/components/admin/AdminForm.tsx` | Added gallery field type support | Admin car gallery management | ✅ Yes |
| `frontend/app/admin/cars/new/page.tsx` | Added gallery field to car form | Admin car gallery management | ✅ Yes |
| `frontend/app/admin/cars/[id]/edit/page.tsx` | Added gallery field to car form | Admin car gallery management | ✅ Yes |
| `frontend/app/admin/cars/page.tsx` | Added catalog file column | Admin car management | ✅ Yes |
| `frontend/components/car/__tests__/RelatedCarsSlider.test.tsx` | **NEW** — Tests | Test coverage | ✅ Yes |
| `frontend/components/admin/__tests__/FileUpload.test.tsx` | **NEW** — Tests | Test coverage | ✅ Yes |
| `frontend/components/ui/__tests__/Tabs.test.tsx` | **NEW** — Tests | Test coverage | ✅ Yes |

### What to restore before merging to main:

**1. `frontend/Dockerfile`** — Uncomment the Arvan mirror line:
```dockerfile
RUN npm config set registry https://npm.arvancloud.ir/
```

**2. `frontend/lib/authFetch.ts`** — Remove `API_BASE` and `fullUrl`, revert to direct fetch:
```typescript
// BEFORE (local dev):
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const API_BASE = RAW_API_BASE.replace(/\/api\/v1\/?$/, '')
// ...
const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
return fetch(fullUrl, { ...options, headers })

// AFTER (production — revert to this):
return fetch(url, { ...options, headers })
```

**3. Delete `frontend/lib/apiUrl.ts`** — This file doesn't exist on main.

**4. Revert all `apiUrl()` imports** in these files — replace `apiUrl('/api/v1/...')` back to `'/api/v1/...'`:
- `frontend/contexts/SettingsContext.tsx`
- `frontend/components/home/FeaturedCars.tsx`
- `frontend/components/home/HeroSlider.tsx`
- `frontend/components/home/LatestArticles.tsx`
- `frontend/components/home/WhyRahnavard.tsx`
- `frontend/components/home/Branches.tsx`
- `frontend/components/home/ConsultationForm.tsx`
- `frontend/components/car/RelatedCarsSlider.tsx`

**5. Revert `frontend/components/ui/OptimizedImage.tsx`** — Remove the `localhost:8000/media/` unoptimized check:
```typescript
// Remove this block:
// if (src.startsWith('http://localhost:8000/media/')) {
//   // ... mark as unoptimized
// }
//
// And revert isMediaUrl to not include localhost:
// const isMediaUrl = src.startsWith('/media/') || src.includes('rahnavard.co/media/')
```

**6. Revert `frontend/next.config.js`** — Remove `backend:8000` from `images.remotePatterns`:
```javascript
// Remove this pattern:
// { protocol: 'http', hostname: 'backend', port: '8000', pathname: '/media/**' },
```

**7. Revert `backend/config/settings.py`** — Remove DEBUG-conditional throttle rates:
```python
# Revert to:
"anon": "100/hour",
"user": "1000/hour",
```

**8. Revert `frontend/components/car/CarImageGallery.tsx`** — Remove `apiUrl` import and `resolveMediaUrl` function:
```typescript
// Remove this import:
// import { apiUrl } from '@/lib/apiUrl'
//
// Remove this function:
// function resolveMediaUrl(url: string): string {
//   if (url.startsWith('http')) return url
//   if (url.startsWith('/media/')) return apiUrl(url)
//   return url
// }
//
// And revert allImages to not use resolveMediaUrl:
// const allImages = [mainImage, ...gallery].filter(Boolean)
```

**9. Revert `frontend/app/cars/[slug]/page.tsx`** — Remove `resolveMediaUrl` function and its usage:
```typescript
// Remove this function:
// function resolveMediaUrl(url: string): string {
//   if (url.startsWith('http')) return url
//   if (url.startsWith('/media/')) {
//     const host = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || ''
//     return host ? `${host}${url}` : url
//   }
//   return url
// }
//
// And revert CarImageGallery props to use raw URLs:
// <CarImageGallery
//   mainImage={car.main_image}
//   gallery={car.gallery || []}
//   persianName={car.persian_name}
// />
```

> **Why?** In production, nginx proxies `/api/*` → backend. Relative URLs work.
> In local dev (no nginx), relative URLs hit port 3000 (Next.js) → 404.
> The `apiUrl` helper builds `http://localhost:8000/api/v1/...` in local dev,
> but returns `/api/v1/...` (relative) in production.
>
> The OptimizedImage and throttle changes only affect local Docker dev.
> Production uses nginx for media serving and has appropriate rate limits.

> **Note:** The soft delete changes (mixins, models, views, serializers), gallery upload (GalleryUpload, AdminForm, serializers), car page redesign (CarImageGallery, PdfViewer, Tabs, car detail page), and all tests are **safe to merge**.
> Only the Dockerfile, authFetch, apiUrl, client component, OptimizedImage, next.config.js, settings.py, CarImageGallery's `resolveMediaUrl`, and the car page's `resolveMediaUrl` changes need to be reverted.

---

*Last updated: 2026-08-28 (added apiUrl helper for local dev API calls)*
