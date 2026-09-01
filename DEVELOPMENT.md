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
> ⚠️ **Always use the scripts — manual re-apply is error-prone and WILL miss files.**

### Overview

```
develop (with local-only changes)
    ↓
Step 1: Stash local-only changes (saves them safely)
    ↓
Step 2: Revert local-only files to main versions
    ↓
Step 3: Commit revert
    ↓
Step 4: git checkout main → merge develop → push main
    ↓
Step 5: git checkout develop → merge main
    ↓
Step 6: Apply stash (restores all local-only changes)
    ↓
develop ready for local dev again
```

---

### Automated Workflow (Recommended)

#### Before merging to main:
```bash
git checkout develop && git pull origin develop

# Final checks
cd backend && python manage.py check && pytest --no-cov
cd frontend && npm run lint && npx tsc --noEmit && npm test -- --watchAll=false
cd ..

# Stash local-only changes and revert them (ONE COMMAND)
bash scripts/prepare-merge.sh

# Commit the revert, merge, push
git add -A
git commit -m "revert: prepare local-only files for production merge"
git checkout main && git merge develop --no-edit && git push origin main
```

#### After merging back to develop:
```bash
git checkout develop && git merge main --no-edit

# Restore all local-only changes from stash (ONE COMMAND)
bash scripts/apply-local-only.sh

# Commit and push
git add -A
git commit -m "chore: re-apply local-only changes for Docker dev"
git push origin develop
```

---

### Manual Workflow (Only if scripts fail)

If the scripts don't work (e.g., stash conflicts), follow these steps manually:

#### Step 1: Make sure you're on develop and up to date
```bash
git checkout develop
git pull origin develop
```

#### Step 2: Run final checks
```bash
cd backend && python manage.py check && pytest --no-cov
cd frontend && npm run lint && npx tsc --noEmit && npm test -- --watchAll=false
cd ..
```

#### Step 3: Stash local-only changes
```bash
# Save local-only changes to a named stash
git stash push -m "local-only-$(date +%Y%m%d)" -- \
  frontend/Dockerfile \
  frontend/lib/apiUrl.ts \
  frontend/lib/authFetch.ts \
  frontend/contexts/SettingsContext.tsx \
  frontend/components/home/FeaturedCars.tsx \
  frontend/components/home/HeroSlider.tsx \
  frontend/components/home/LatestArticles.tsx \
  frontend/components/home/WhyRahnavard.tsx \
  frontend/components/home/Branches.tsx \
  frontend/components/home/ConsultationForm.tsx \
  frontend/components/car/RelatedCarsSlider.tsx \
  frontend/components/car/ConsultationModal.tsx \
  frontend/components/car/CarImageGallery.tsx \
  frontend/app/cars/[slug]/page.tsx \
  frontend/components/ui/OptimizedImage.tsx \
  frontend/next.config.js \
  backend/config/settings.py
```

#### Step 4: Revert local-only files to main versions
```bash
for f in $(grep -v '^#' LOCAL_ONLY_FILES.txt | grep -v '^\s*$' | sed 's/^[[:space:]]*//'); do
  git checkout main -- "$f" 2>/dev/null || true
done
```

#### Step 5: Commit, merge, push
```bash
git add -A
git commit -m "revert: prepare local-only files for production merge"
git checkout main
git merge develop --no-edit
git push origin main
```

#### Step 6: Switch back to develop, merge main, restore stash
```bash
git checkout develop
git merge main --no-edit

# Find and apply the most recent local-only stash
STASH_REF=$(git stash list | grep "local-only" | head -1 | cut -d: -f1)
if [ -n "$STASH_REF" ]; then
  git stash pop "$STASH_REF"
  echo "✅ Local-only changes restored!"
else
  echo "⚠️  No local-only stash found. Re-apply manually."
fi
```

#### Step 7: Commit and push
```bash
git add -A
git commit -m "chore: re-apply local-only changes for Docker dev"
git push origin develop
```

---

### Quick Reference (Copy-Paste)

```bash
# === MERGE TO PRODUCTION ===
git checkout develop && git pull origin develop
bash scripts/prepare-merge.sh                     # Stash + revert local-only files
git add -A && git commit -m "revert: prepare for production merge"
git checkout main && git merge develop --no-edit && git push origin main

# === BACK TO LOCAL DEV ===
git checkout develop && git merge main --no-edit
bash scripts/apply-local-only.sh                  # Restore from stash
git add -A && git commit -m "chore: re-apply local-only changes"
git push origin develop
```

---

### What Happens After Each Step

| Step | What Happens | Risk |
|------|-------------|------|
| Stash local-only | Changes saved in git stash | 🟢 None |
| Revert local-only | Code matches production | 🟢 None |
| Push main | GitHub Actions CI runs | 🟢 None |
| CI passes | Deploy auto-triggers | 🟢 None |
| Deploy completes | rahnavard.co updated | 🟢 None |
| Back to develop | Local dev resumes | 🟢 None |
| Apply stash | All local changes restored | 🟢 None |

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

> ⚠️ **CRITICAL: These files exist ONLY on `develop` and must NEVER be merged to `main`.**
> They are for local Docker development only. Merging them will break CI and deploy.

### The Single Source of Truth

**`LOCAL_ONLY_FILES.txt`** — Lists every file that must NOT be merged to main.

```
# How to check before any merge:
bash scripts/check-local-only.sh
```

The script reads `LOCAL_ONLY_FILES.txt` and checks if any of those files appear in the diff between develop and main. If violations are found, it shows exactly which files to revert and how.

### Why local-only changes exist

In production, nginx proxies `/api/*` → backend. Relative URLs like `fetch('/api/v1/cars/')` work because nginx forwards them.

In local Docker dev, there's no nginx proxy. The Next.js dev server on port 3000 doesn't know about Django on port 8000. Local-only changes bridge this gap:

- **`apiUrl()`** — works on both server and client. Server: resolves to `http://backend:8000/...`. Client on localhost: resolves to `http://localhost:8000/...`. Client in production: returns relative path (nginx handles proxying)
- **`authFetch.ts`** — uses `NEXT_PUBLIC_API_URL` base for admin API calls in dev
- **`Dockerfile`** — removes Arvan npm mirror (403 outside Iran)
- **`OptimizedImage.tsx`** — marks localhost media as unoptimized
- **`next.config.js`** — adds `backend:8000` to image remote patterns
- **`settings.py`** — higher throttle rates for testing

### Pre-Merge Checklist (MUST run before merge to main)

```bash
# 1. Stash local-only changes (saves them for later restoration)
bash scripts/prepare-merge.sh

# 2. Commit the revert, merge to main, push
git add -A
git commit -m "revert: prepare local-only files for production merge"
git checkout main && git merge develop --no-edit && git push origin main

# 3. Switch back to develop and restore local changes
git checkout develop && git merge main --no-edit
bash scripts/apply-local-only.sh
git add -A && git commit -m "chore: re-apply local-only changes"
git push origin develop
```

### When adding new local-only changes

If you create a new file or modify an existing file for local dev purposes:

1. Add the file path to `LOCAL_ONLY_FILES.txt`
2. Run `bash scripts/check-local-only.sh` to verify it's detected
3. The merge workflow will now automatically include it in stashing and reverts

### Full documentation

See `LOCAL_ONLY_FILES.txt` for the complete list with reasons.
See `scripts/check-local-only.sh` for the automated check script.
See Section 7 for the full merge workflow.

---

*Last updated: 2026-09-01 (added stash-based merge workflow, prepare-merge.sh, apply-local-only.sh)*
