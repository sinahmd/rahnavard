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
| **App (nginx)** | **http://localhost** | **Entry point — all requests go here** |
| Frontend (HMR) | internal:3000 | Next.js dev server (proxied by nginx) |
| Backend API | http://localhost:8000/api/v1/ | Django REST API (direct access) |
| Django Admin | http://localhost:8000/django-admin/ | Superuser access |
| PostgreSQL | localhost:5432 | User: `user`, Pass: `pass` |

> ⚠️ **Always access the app through http://localhost (port 80), not port 3000.**
> nginx proxies `/api/*` to the backend and `/*` to the frontend, matching production behavior.

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

> The dev environment is Docker: `docker compose up` (nginx at http://localhost,
> frontend + backend + postgres containers). **Run tests/checks inside the
> containers** — both images already contain all the tooling needed.

```bash
# Start / stop
docker compose up --build          # Start with rebuild
docker compose down                # Stop all
docker compose restart backend     # Restart one service

# Database
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell

# Backend checks (dev deps incl. pytest are baked into the dev image)
docker compose exec backend python -m pytest -q
docker compose exec backend python manage.py check

# Frontend checks (jest/tsc/eslint/next are installed in the image)
docker compose exec frontend npm test -- --runInBand
docker compose exec frontend npx tsc --noEmit
docker compose exec frontend npm run lint
```

### 3.5 Full pre-commit verification (all inside Docker)

```bash
# Backend
docker compose exec -T backend python -m pytest -q
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py makemigrations --check --dry-run

# Frontend
docker compose exec -T frontend npm test -- --runInBand
docker compose exec -T frontend npx tsc --noEmit
docker compose exec -T frontend npm run lint

# Production build — run in a throwaway container so the running dev server's
# .next volume is left untouched:
docker compose run --rm --no-deps frontend npm run build
```

Verified green on 2026-09-05 (after Phase 4): backend **283 passed**
(98.29% coverage, SQLite :memory: via `config.test_settings`), frontend
**265 passed**, `tsc` clean, lint clean except the known Google-font `<link>`
warning (`app/layout.tsx`) — do not "fix" it with `next/font/google` (prod image
builds run where Google Fonts is blocked). Backend tests need no Postgres;
frontend needs no API server.

### 3.7 Phase 3 — server/client boundary + route architecture (status)

Phase 3 is committed on `develop` (see docs/SENIOR_REFACTOR_PLAN.md §7).

- **Route structure**: public pages live under `app/(site)/`; the root
  `app/layout.tsx` is a minimal shell (html/body/fonts/metadata). Settings are
  server-fetched in `(site)/layout.tsx`; `SettingsContext` was deleted.
  `app/admin/layout.tsx` is providers-only (AuthProvider) and the guard/shell
  lives in `app/admin/(protected)/layout.tsx`, so `/admin/login` sits outside
  the protected boundary while still receiving AuthProvider.
- **Home page**: server component; `lib/data/home.ts` provides the section
  data; the hero slider / featured cars / articles / branches / consultation
  form are client islands that receive typed data as props and no longer
  fetch on mount.
- **Listings (`/cars`, `/articles`)**: URL `searchParams` are the single
  source of truth inside `CarsExplorer`/`ArticlesExplorer` (no React state
  mirrors, no URL↔state sync effects; transient state only for input
  typing/debounce, drawer, loading/error). The pages are async server shells
  that parse the URL with shared listQuery helpers, fetch the matching first
  page + filter options, and pass a snapshot to the island, which skips its
  initial fetch when the URL matches `initialQuery` — the first HTML contains
  the actual cards.
- **Detail pages**: use shared `getCarDetail`/`getArticleDetail`
  (retry/backoff + timeout + media normalization in `lib/data/*`); missing
  entities call `notFound()`; `(site)/loading.tsx` and `(site)/error.tsx`
  provide public boundaries.

Architecture rules (grep-verified): `lib/data/*` is server-only and never
imports `lib/api/*` or reads cookies/localStorage; `lib/api/*` is
browser/admin-only; no application code references `SettingsContext` or calls
`/auth/session/` from public routes.

> Phase 2 dual-mode remains active: `TokenAuthentication` is still first and
> the login response still carries a legacy `token` field. Removal is gated on
> the §3.6 staging smoke checklist + owner approval — do not treat Phase 3 as
> auth cutover.

### 3.8 Phase 4 — admin correctness & reuse (status)

Phase 4 is committed on `develop` (see docs/SENIOR_REFACTOR_PLAN.md §6.E/§6.F).

- **`AdminListPage`** (`components/admin/list/`): one typed, generic table
  shell used by all six admin list pages. Owns fetch state, loading,
  error/retry, empty state, and pagination derived from the backend envelope
  (`count` / `page_size`) — lists beyond the 20-row page size are now fully
  navigable. Edge cases pinned by tests: an empty page after deleting the
  last row of a last page refetches page 1; a 404 on a stale higher page
  falls back one page; row actions receive `refresh`/`error` helpers.
- **Stats endpoint**: `GET /api/v1/admin/stats/` (staff-only) returns four
  direct SQL counts. The dashboard uses it instead of counting page-1 rows.
  The inquiry count includes soft-deleted rows to match the admin inquiries
  list total (`with_deleted()`).
- **`AdminForm` split** (the 575-line god-file is gone):
  - `components/admin/form/useAdminForm.ts` — transport-free form state
    machine (values/touched/validation/submit). `load` and `submit` are
    injected by the page; the load effect keys on `loadId` (the record
    identity), never on the inline loader callback, so edit pages fetch once
    per record. It imports nothing from `lib/api`.
  - `components/admin/form/fields.tsx` — one renderer per field type;
    `fieldSpanClass` preserves the legacy full-width behavior for the named
    content fields (including single-line inputs).
  - `lib/api/formData.ts` — the single home of the multipart conventions:
    files under their field name, `File[]` as `<field>_0..N`, booleans as
    `'true'/'false'`, null/undefined skipped so edits keep existing files.
    Entity endpoint modules own `saveX(values)` (create-vs-edit = one
    signature). The `gallery_0..N` contract is pinned by frontend tests
    (formData + endpoints) AND backend tests (`TestCarAdminGalleryAndPagination`).
- **Coverage scope**: jest `collectCoverageFrom` now also measures
  `components/admin/form/**` and `components/admin/list/**`.
- The settings admin page intentionally keeps its own hand-rolled form
  (different shape: singleton PATCH + toast) — not part of the split.
- Phase 2 dual-mode remains active: `TokenAuthentication` removal is still
  gated on the §3.6 staging smoke checklist + owner approval.

### 3.6 Phase 2 — auth staging smoke checklist (session cookies + CSRF)

Phase 2 put the admin on **Django session cookies** (`sessionid`, httpOnly) with
CSRF, but **dual-mode is still active**: the backend keeps `TokenAuthentication`
first (legacy clients still work) and login still returns a `token` field that
new clients deliberately ignore. TokenAuthentication removal is gated on this
checklist passing **on staging** plus the project owner's explicit approval.

Auth is scoped to the admin routes (public pages never call `/auth/session/`
and are never redirected to `/admin/login`). Session logout **preserves** the
legacy DRF token; only a token-authenticated logout deletes the presented
token. The old `localStorage['admin_token']` key is left untouched during
dual mode — its one-time purge happens only in the cutover commit.

Manual smoke (browser → http://localhost):
- [ ] Visit the public homepage while logged OUT — page loads normally, NO
      redirect to `/admin/login`, and Network shows no `/auth/session/` call
- [ ] Fresh browser → `/admin/login` — the legacy `admin_token` key is NOT
      purged yet (dual mode); it must simply never be read or written
- [ ] Log in with an admin account — redirect to `/admin` works
- [ ] Confirm cookies: `sessionid` (HttpOnly ✓) and `csrftoken` (readable) exist
- [ ] Reload / hard-reload `/admin/...` — session restores without re-login
- [ ] DevTools → Application → Cookies → delete `sessionid`, then click any
      admin nav item — expect redirect to `/admin/login` (401 policy)
- [ ] CRUD write smoke — every admin entity, both create and edit+save, and at
      least one delete: branches, hero-slides, features, cars (incl. gallery/
      file upload — FormData path), articles, settings; each must save without
      CSRF errors (check the Network tab for the `X-CSRFToken` header)
- [ ] Log out (session) → confirm `sessionid` cookie is gone server-side, you
      land on `/admin/login`, and any legacy DRF token for that user still
      exists server-side (it is preserved during dual mode)
- [ ] While logged in as admin, open the public consultation form and submit —
      must succeed (201) without a CSRF token (public inquiry is exempt)
- [ ] Non-admin user (or no login) hitting `/api/v1/admin/*` gets 401/403

Regression rollback (if any step fails): the previous commit re-enables the old
behavior — no data migration is involved, only code. Reordering/removing
`SessionAuthentication` in `REST_FRAMEWORK` (settings.py) and reverting the
frontend http.ts/AuthContext commit restores token auth.

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

# Final checks (inside local Docker — see §3.4/§3.5)
docker compose exec -T backend python manage.py check && docker compose exec -T backend python -m pytest -q
docker compose exec -T frontend npm run lint && docker compose exec -T frontend npx tsc --noEmit && docker compose exec -T frontend npm test -- --runInBand

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
# (Only 4 files — the nginx proxy eliminated component-level changes)
git stash push -m "local-only-$(date +%Y%m%d)" -- \
  docker-compose.yml \
  frontend/Dockerfile \
  backend/config/settings.py
# Note: nginx/nginx.dev.conf is untracked, use --include-untracked if present
git stash push -m "local-only-$(date +%Y%m%d)" --include-untracked -- nginx/nginx.dev.conf 2>/dev/null || true
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

### "API calls fail with 404 in browser"

Make sure you're accessing the app through **http://localhost** (port 80, nginx), not http://localhost:3000.

The nginx proxy routes `/api/*` → backend. Without it, browser fetch calls to `/api/v1/...` hit the frontend server → 404.

### "npm install fails with 403 Forbidden (npm mirror)"

The Arvan npm mirror (`npm.arvancloud.ir`) blocks some packages outside Iran. The local `frontend/Dockerfile` should have the mirror **commented out**:

```dockerfile
# RUN npm config set registry https://npm.arvancloud.ir/
```

> ⚠️ **Do NOT change `frontend/Dockerfile.prod`** — production uses `registry.npmmirror.com` and works fine from Arvan Cloud.

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
- ✅ Session-cookie admin auth (dual-mode with legacy token until cutover)
- ✅ SEO: metadata, sitemap, robots.txt, Schema.org
- ✅ Docker development + production setup
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Mobile responsive (hamburger menu, hero slider)
- ✅ PDF viewer component with download and fullscreen
- ✅ Tabs component (reusable)
- ✅ Image gallery with lightbox, keyboard navigation, thumbnails
- ✅ Related cars slider
- ✅ Server-rendered public pages (home + listings) with client islands
- ✅ Search/filter/sort/pagination on listing pages with URL-derived state

### What needs development:
- 🔲 Car comparison tool
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

### Architecture: Nginx Proxy in Local Dev

Local Docker dev uses an **nginx proxy** (port 80) that matches production routing:

```
Production:  Browser → nginx:80 → /api/*  → backend:8000
                          nginx:80 → /*     → frontend:3000

Local Dev:   Browser → nginx:80 → /api/*  → backend:8000  (same!)
                          nginx:80 → /*     → frontend:3000 (with HMR)
```

This means **frontend components use the same relative URLs on both branches** — no `apiUrl()` rewrites needed. The nginx proxy (`nginx/nginx.dev.conf`) handles the routing.

### The Single Source of Truth

**`LOCAL_ONLY_FILES.txt`** — Lists every file that must NOT be merged to main.

```
# How to check before any merge:
bash scripts/check-local-only.sh
```

The script reads `LOCAL_ONLY_FILES.txt` and checks if any of those files appear in the diff between develop and main. If violations are found, it shows exactly which files to revert and how.

### What's local-only (4 files)

| File | Why it's local-only |
|------|--------------------|
| `docker-compose.yml` | Adds nginx proxy service, dev volumes, port config |
| `nginx/nginx.dev.conf` | Dev nginx config (no SSL, simplified, WebSocket HMR) |
| `frontend/Dockerfile` | Arvan npm mirror commented out (403 outside Iran) |
| `backend/config/settings.py` | Higher throttle rates for local testing |

> The production stack uses `docker-compose.prod.yml` and `Dockerfile.prod` — completely separate files.

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

*Last updated: 2026-09-05 (Phase 4 admin correctness & reuse committed)*
