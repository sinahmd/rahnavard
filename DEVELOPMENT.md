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
- ✅ Cars listing and detail pages
- ✅ Articles listing and detail pages
- ✅ Full admin panel (CRUD for all entities)
- ✅ Token-based authentication
- ✅ SEO: metadata, sitemap, robots.txt, Schema.org
- ✅ Docker development + production setup
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Mobile responsive (hamburger menu, hero slider)

### What needs development:
- 🔲 Car comparison tool
- 🔲 Search/filter functionality
- 🔲 Pagination on listing pages
- 🔲 Image gallery lightbox on car detail
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

| File | Change | Reason | Merge to main? |
|------|--------|--------|----------------|
| `frontend/Dockerfile` | Removed `npm.arvancloud.ir` mirror | Mirror returns 403 outside Iran | ❌ No |
| `frontend/lib/authFetch.ts` | Uses `NEXT_PUBLIC_API_URL` for full URL | No nginx in local dev, relative URLs hit port 3000 | ❌ No |
| `frontend/.dockerignore` | Created | Speeds up local Docker builds | ✅ Yes |
| `backend/.dockerignore` | Created | Speeds up local Docker builds | ✅ Yes |
| `backend/apps/core/mixins.py` | Created `SoftDeleteMixin` | Data safety feature | ✅ Yes |
| `backend/apps/*/models.py` | Added soft delete fields | Data safety feature | ✅ Yes |
| `backend/apps/*/views.py` | Admin views use `with_deleted()` | Admin needs to see deleted items | ✅ Yes |
| `backend/apps/*/serializers.py` | Added `is_deleted` to admin serializers | Admin restore functionality | ✅ Yes |
| `backend/apps/*/admin.py` | Added restore/delete actions | Admin UI improvement | ✅ Yes |

### What to restore before merging to main:

**1. `frontend/Dockerfile`** — Uncomment the Arvan mirror line:
```dockerfile
RUN npm config set registry https://npm.arvancloud.ir/
```

**2. `frontend/lib/authFetch.ts`** — Remove `NEXT_PUBLIC_API_URL` prefix, revert to relative URLs:
```typescript
// BEFORE (local dev):
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
return fetch(fullUrl, { ...options, headers })

// AFTER (production — revert to this):
return fetch(url, { ...options, headers })
```

> **Why?** In production, nginx proxies `/api/*` → backend. Relative URLs work.
> In local dev (no nginx), relative URLs hit port 3000 (Next.js) → 404.

> **Note:** The soft delete changes (mixins, models, views, serializers) are **safe to merge**.
> Only the Dockerfile and authFetch changes need to be reverted.

---

*Last updated: 2026-08-27 (updated merge workflow)*
