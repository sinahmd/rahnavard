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

Verified green on 2026-09-05 (after Phase 5 + manual smoke fixes): backend
**282 passed** (98.32% coverage, SQLite :memory: via `config.test_settings`),
frontend **302 passed / 39 suites** with **zero act warnings and zero console
errors** (grep-verified on the full `npm test` output), `tsc` clean, and
**lint fully clean** — fonts are self-hosted via `next/font/local`
(`frontend/lib/fonts.ts` + `frontend/fonts/`, Vazirmatn from the upstream
repo and Poppins latin), so the old Google-fonts `<link>` warning is gone.
Never use `next/font/google` (prod image builds run where Google Fonts is
blocked; local files only). Backend tests need no Postgres; frontend needs
no API server.

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

> ✅ Phase 2 cutover is COMPLETE (2026-09-05, §3.11): TokenAuthentication is
> removed — session-only auth. The §3.6 smoke checklist was executed and
> recorded before the removal.

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
- ✅ Phase 2 cutover COMPLETE (2026-09-05, §3.11) — session-only auth.

### 3.9 Phase 5 — UI/a11y polish & measured performance (status)

Phase 5 is committed on `develop` (see docs/SENIOR_REFACTOR_PLAN.md §6.H/§6.I/§6.J).

- **UI consistency (real duplication only)**: `SectionHead`
  (components/site/) extracted from five copies of the
  eyebrow/title/description pattern; `CarCardImage` from the three card image
  blocks; admin primitives `PageHeader` / `ErrorState` (with optional retry,
  `role="alert"`) / `EmptyState` / `ConfirmDialog` under
  components/admin/ui/. No component library, no design-token rewrite; card
  markup stays deliberately different where it is.
- **Accessibility**:
  - **Skip link**: first focusable element on every public page
    (`(site)/layout.tsx`), keyboard-visible on focus, targets
    `#main-content` — every public `<main>` carries that id.
  - **ConfirmDialog** replaces all five `window.confirm()` delete flows
    (cars/articles/branches/features/hero-slides via `helpers.confirm()`):
    `role="dialog"` + `aria-modal`, labelled/described by title+text,
    initial focus on cancel (destructive-safe), Escape and overlay click
    cancel, Tab trapped, focus returned to the trigger.
  - **Focus management**: one shared `useModalA11y` hook
    (components/ui/) powers ConfirmDialog, MobileNav, the CarFilters mobile
    drawer, and ConsultationModal — Escape, Tab trap, initial focus, focus
    return. Closed drawers are `aria-hidden` + `visibility:hidden`, so
    off-screen controls leave the tab order.
  - **Reduced motion**: the globals.css `prefers-reduced-motion` block now
    also kills `.animate-slide-up` / `.animate-hero-zoom` and blankets
    `transition/animation-duration: 0.01ms`; HeroSlider JS autoplay pauses
    under the preference (manual prev/next/dots still work).
  - **Tables**: AdminListPage renders a sr-only `<caption>` and
    `scope="col"` headers. **Status is not color-only**: every admin status
    toggle (active/featured/read/contacted) carries `aria-pressed`.
  - **Announced states**: AdminListPage loading → `role="status"`;
    ErrorState/error banners → `role="alert"`; consultation submit success →
    `role="status"`, failure → `role="alert"`.
- **Performance (measured, honest)**: `next build` first-load JS — `/`
  107 kB, `/cars` 109 kB, `/cars/[slug]` 108 kB; `curl` (no JS) of `/`
  returns 47.8 kB of SSR'd HTML with real car links. No image code change was
  justified: media URLs already bypass the optimizer (`OptimizedImage`
  `unoptimized`). Fonts are now **self-hosted** (`next/font/local`, Vazirmatn
  woff2 from the upstream repo + Poppins latin in `frontend/fonts/`): the
  Google `<link>`/`@import` pair is gone, `display: swap` is handled by
  next/font, and every weight is preloaded from `/_next/static/media/`
  (verified: zero `fonts.googleapis` in built page HTML; 10 preloads on `/`).
  `next/font/google` stays forbidden (build host cannot reach Google Fonts).
  Deferred: the local next/image media optimizer ECONNREFUSED (dev-only —
  nginx same-origin production behavior is unaffected).
- **Manual smoke (local Docker, §9-style)**: seeded 26 cars → admin
  pagination verified through nginx (page1 = 20 rows, page2 = 6,
  `?page=999` → 404; no-CSRF POST → 403; with-CSRF invalid → 400 with
  Persian field errors). Car form gallery create (`gallery_0/1` → 2 URLs)
  and edit-append (existing preserved + new file appended → 3 URLs) via
  real multipart. Two real bugs surfaced and fixed:
  - **Duplicate-slug create returned HTTP 500** (unhandled IntegrityError
    from the partial unique index) — `CarAdminListView.create` now maps it
    to a 400 `slug` field error (pinned by
    `test_admin_create_duplicate_slug_returns_400_field_error`).
  - **Gallery edit-append overwrote the first existing image's disk file**
    (new files were named `{slug}_gallery_{idx}` with the counter
    restarting at 0) — the counter now continues past the existing gallery
    (pinned by the extended append test).
  - **Accepted/deferred technical debt — slug-based gallery filenames**: gallery
    files are named `{slug}_gallery_{idx}`. This is safe for current public
    media requirements: each active car has a unique slug (partial unique
    index), filenames are readable/stable, and public images do not require
    unpredictable URLs. Changing to UUID-based immutable paths
    (`cars/{car_id}/gallery/{uuid}.webp`) would need a storage migration,
    a URL/backward-compatibility plan, and orphan-file cleanup — deferred.
    One future edge case: slug reuse after soft deletion or slug changes;
    if that becomes common, move to the immutable identifier above. The
    no-collision guarantee is pinned by
    `test_distinct_active_cars_do_not_collide_gallery_files` (two active
    cars uploading `gallery_0..N` produce four distinct files).
  - **Axe spot checks** (headless Chrome + axe-core over the hydrated
    public pages) found: unlabeled filter selects (critical) → aria-labels
    added; footer `tel:` link empty when phone unset (serious) → rendered
    only when a phone exists; two unlabeled nav landmarks → desktop nav
    `aria-label="ناوبری اصلی"`; heading skips → card h4/footer h5 became
    h3, home gained an sr-only h1. Post-fix: **0 violations** on `/`,
    `/cars`, and a car detail page (remaining axe items are
    jsdom-incomplete visibility/streaming artifacts).
- **Coverage**: jest scope unchanged (lib/api + lib/data + contexts + admin
  form/list); new a11y suites live under components/{admin/ui,car,layout,
  home}/__tests__ and app/__tests__.
- ✅ Phase 2 cutover COMPLETE (2026-09-05, §3.11) — session-only auth.

### 3.10 Phase 6 — hardening & delivery (status)

Phase 6 is committed on `develop` (see docs/SENIOR_REFACTOR_PLAN.md §7 and
docs/adr/0006 for the recorded decisions).

- **CSP (ENFORCED since 2026-09-05)**: both prod (`nginx/nginx.conf`) and dev
  (`nginx/nginx.dev.conf`) send the tightened enforcing
  `Content-Security-Policy` — `default-src 'self'`, no CDN script/style/font
  sources (fonts are self-hosted since `07e72c8`), plus `base-uri 'self'`,
  `object-src 'none'`, `form-action 'self'`. The flip was gated on an
  executable audit (`frontend/e2e/csp-audit.spec.ts`): a
  `securitypolicyviolation` + console collector sweeping public and admin
  pages found zero violations beyond Next-dev `eval()`. Prod must NEVER gain
  `'unsafe-eval'`; the DEV conf carries it for Next dev/HMR. Rollback =
  revert the header name.
- **Cookie flags explicit**: `SESSION_COOKIE_HTTPONLY=True`,
  `SESSION_COOKIE_SAMESITE="Lax"`, `CSRF_COOKIE_HTTPONLY=False` (readable on
  purpose — echoed as `X-CSRFToken`), `CSRF_COOKIE_SAMESITE="Lax"`; pinned by
  `test_cookie_flags_session_httponly_csrf_readable` (backend suite 286).
- **Local-only merge dance hardened** (deviation from the plan's "retire",
  recorded in docs/adr/0006): shared `scripts/_local_only_guard.sh` refuses
  protected production paths in `LOCAL_ONLY_FILES.txt` or restore backups;
  `settings.py` removed from the list (it previously would have been reverted
  on every develop → main merge, dropping the auth config from production).
  Local-only is now exactly 3 genuinely dev-only files (§11).
- **CI secret-scan**: `secret-scan` job runs `scripts/scan-secrets.sh` on
  every push/PR — `git grep` over TRACKED files for secret formats
  (private-key headers, token prefixes, high-entropy values), never printing
  matched content. `.gitignore` carries `!scripts/scan-secrets.sh` so the
  scanner isn't caught by its own `*secret*` rule.
- **Health-gated deploys**: `deploy.yml` and `scripts/quick-deploy.sh` no
  longer do a blind `down`/`up`. Flow: build (deploy.yml) → explicit
  idempotent `migrate --noinput` → `up` backend → backend health gate
  (12×5s) → `up` frontend → `--force-recreate` nginx LAST (it caches upstream
  IPs at startup) → end-to-end health through nginx (12×5s) → logs + non-zero
  exit on failure. The entrypoint's own migrate remains as a safety net.
- **ADRs**: docs/adr/0001–0006 record the §17 decisions (session auth, route
  structure, data boundaries, SSR + URL single-source, no new deps, Phase 6
  infra hardening). Superseded pre-refactor docs moved to `docs/archive/`
  (see its README for the mapping).
- **Validation (Docker, 2026-09-05)**: backend **286 passed / 98.32% cov**;
  `nginx -t` green on BOTH the dev conf (running container) and the prod conf
  (mounted into a container); report-only header verified through dev nginx
  via curl; `bash -n` on all changed scripts; `scan-secrets.sh` exits 0 on the
  repo; `check-local-only.sh` runs green against main..develop. Frontend:
  **301 jest tests** (e2e excluded), `tsc` clean, `lint` clean in-container
  after `docker compose exec frontend npm install` — note `/app/node_modules`
  is an anonymous volume that survives image rebuilds, so new devDependencies
  need the documented in-container `npm install`. **5 Playwright E2E specs
  passed** on the host against the stack.
- **Playwright E2E (plan 6.4)**: specs in `frontend/e2e/` run against the
  local Docker stack through nginx (not CI): public SSR content + enforced
  CSP header + listing→detail navigation, the admin session flow, the §3.6
  smoke matrix (see §3.6 for the record) and the CSP violation audit.
  System Chrome via `channel: 'chrome'` — no browser download. Setup + run:
  `e2e/README.md` (dedicated `e2e_admin` user, seeded via manage.py). Specs
  are excluded from jest (`testPathIgnorePatterns`); workers capped to 1
  (Next dev's on-demand compilation starves under parallel workers).

### 3.11 Phase 2 cutover — TokenAuthentication removed (session-only)

The owner approved the plan on 2026-09-05; the cutover commits are on
`develop` (see docs/adr/0001 for the decision record).

- **What changed**: `REST_FRAMEWORK` authenticates via
  `SessionAuthentication` only; `rest_framework.authtoken` left
  `INSTALLED_APPS`; login returns exactly `{user}` (no token minted);
  change-password keeps `update_session_auth_hash` and no longer rotates a
  token; logout is session-only; the accounts `post_save` token-minting
  signal is deleted. The `authtoken_token` TABLE remains in existing
  databases (Django never drops tables; rows are inert — optional one-off
  SQL cleanup, deferred).
- **One-time frontend cleanup**: `AuthContext` purges
  `localStorage['admin_token']` exactly once on the first admin bootstrap
  (never reads it); `LoginResponse` is `{user}`.
- **Behavioral delta to know**: DRF issues a 401 challenge only through
  authenticators providing a `WWW-Authenticate` header (Token/Basic). With
  SessionAuthentication alone, **unauthenticated requests to
  permission-protected endpoints answer 403, not 401**. Consequences baked
  into code and tests: the admin bootstrap (`fetchSession`) treats 401 AND
  403 as "unauthenticated" (the layout guard owns the redirect); the
  transport-level 401 → `/admin/login` redirect stays for any 401 DRF still
  emits, but a deleted/expired session inside a client-side navigation now
  surfaces the page's error state — only a hard navigation re-bootstraps and
  redirects. Ten `requires-auth` backend expectations were updated 401 → 403.
- **CSP**: enforced (see §3.10).
- **Validation (Docker, 2026-09-05)**: backend **282 passed / 98.32% cov**
  (7 legacy-token tests removed, new tests pin: login response is exactly
  `{user}`, a stale `Authorization: Token` header authenticates nothing,
  user creation works without the signal, logout is idempotent without a
  session); frontend **302 jest** (incl. the 403-bootstrap + purge contract
  tests), `tsc` clean, `lint` clean; **13/13 Playwright e2e** against the
  stack (§3.6 matrix + CSP audit); curl: login response keys == `['user']`;
  repo grep: zero runtime `TokenAuthentication`/`authtoken`/`admin_token`
  references (comments and the purge constant only).

### 3.6 Phase 2 — auth staging smoke checklist (session cookies + CSRF)

> ✅ **EXECUTED 2026-09-05 — PASSED, CUTOVER LANDED.** Executed as automated
> Playwright specs (`frontend/e2e/admin-auth.spec.ts`) plus the backend
> session/CSRF suite (`apps/accounts/test_session_auth.py`), validated under
> dual-mode BEFORE the removal and re-run green after it. The owner's approval
> of the cutover plan is recorded on 2026-09-05. Two checklist items changed
> meaning at the cutover and are noted inline below. Post-cutover state:
> §3.11.

Phase 2 put the admin on **Django session cookies** (`sessionid`, httpOnly) with
CSRF. TokenAuthentication was removed after this checklist passed (§3.11).

Auth is scoped to the admin routes (public pages never call `/auth/session/`
and are never redirected to `/admin/login`).

Smoke record (browser → http://localhost, automated unless noted):
- [x] Visit the public homepage while logged OUT — page loads normally, NO
      redirect to `/admin/login`, and Network shows no `/auth/session/` call
- [x] Fresh browser → `/admin/login` — during dual mode the legacy
      `admin_token` key was untouched; **at the cutover** it is purged exactly
      once on bootstrap (pinned by e2e + jest)
- [x] Log in with an admin account — redirect to `/admin` works
- [x] Confirm cookies: `sessionid` (HttpOnly ✓) and `csrftoken` (readable) exist
- [x] Reload / hard-reload `/admin/...` — session restores without re-login
- [x] Delete `sessionid`, then click any admin nav item — **post-cutover
      behavior**: the client-side navigation surfaces the page's error state
      (session-only DRF answers 403 without a challenge, so the old 401
      redirect no longer fires — redirecting on 403 would loop for
      forbidden-but-logged-in users); a HARD navigation re-bootstraps and the
      guard redirects to `/admin/login`. Both asserted in e2e.
- [x] CRUD write smoke — every admin entity's write path is covered by the
      backend session/CSRF + multipart tests (Phase 5 manual smoke included
      real gallery/file uploads); the e2e performs a full features-entity
      create → edit → delete through the real UI and asserts `X-CSRFToken`
      on every write (Network-tab check, automated)
- [x] Log out (session) → `sessionid` cookie is gone, you land on
      `/admin/login`. (The dual-mode "legacy token is preserved" clause is
      obsolete — no tokens exist anymore.)
- [x] While logged in as admin, open the public consultation form and submit —
      succeeds (201) without a CSRF token (public inquiry is exempt)
- [x] Non-admin user (or no login) hitting `/api/v1/admin/*` is rejected —
      now **403** (not 401): see the §3.11 behavioral delta

Rollback after a post-cutover failure: revert the `feat(auth): remove
TokenAuthentication` commit — no data migration is involved (the
`authtoken_token` table was never dropped, so re-adding the app + authenticator
restores dual-mode fully).

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
# (Only 3 files — settings.py is protected and must never be stashed/reverted;
# see scripts/_local_only_guard.sh)
git stash push -m "local-only-$(date +%Y%m%d)" --include-untracked -- \
  docker-compose.yml \
  nginx/nginx.dev.conf \
  frontend/Dockerfile
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

The Arvan npm mirror (`npm.arvancloud.ir`) returns 403 outside Iran. Both the
local `frontend/Dockerfile` and `frontend/Dockerfile.prod` therefore set the
China mirror — this is current and correct:

```dockerfile
RUN npm config set registry https://registry.npmmirror.com/
```

> ⚠️ **Do NOT switch the local `frontend/Dockerfile` to the Arvan mirror**
> (commented or not) — it 403s outside Iran and breaks `docker compose up --build`.

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

## 10. Current Project State (as of September 2026)

### What's built and working:
- ✅ Home page with hero slider, featured cars, articles, branches, consultation form
- ✅ Cars listing and detail pages (redesigned with interactive gallery, specs grid, price card)
- ✅ Articles listing and detail pages
- ✅ Full admin panel (CRUD for all entities)
- ✅ Car admin: gallery/slider image upload, catalog file upload, soft delete/restore
- ✅ Session-cookie admin auth (session-only — TokenAuthentication removed, §3.11)
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

### What's local-only (3 files)

| File | Why it's local-only |
|------|--------------------|
| `docker-compose.yml` | Adds nginx proxy service, dev volumes, port config |
| `nginx/nginx.dev.conf` | Dev nginx config (no SSL, simplified, WebSocket HMR, report-only CSP) |
| `frontend/Dockerfile` | Dev server image; uses the China npm mirror (`registry.npmmirror.com`, works outside Iran) |

> ⚠️ **`backend/config/settings.py` is NOT local-only anymore.** It used to be
> listed (higher local throttle rates) — but it carries the Phase-2 session
> auth + CSRF config, so reverting it before a merge silently dropped security
> settings from `main`. It was removed from the list, and
> **`scripts/_local_only_guard.sh`** (sourced by prepare-merge /
> apply-local-only / check-local-only) now refuses to run if any protected
> production path (`backend/config/settings.py`, `docker-compose.prod.yml`,
> `nginx/nginx.conf`, the prod Dockerfiles/entrypoint, `.github/workflows/`)
> appears in `LOCAL_ONLY_FILES.txt` or in a restore backup. Do not work around
> this guard.

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

> The guard (`scripts/_local_only_guard.sh`) will REFUSE the list if you add a
> protected production path (settings.py, prod compose/Dockerfiles/entrypoint,
> prod nginx conf, `.github/workflows/*`). Such files must reach `main`
> unchanged — if a production file truly needs divergent local behavior, solve
> it with environment variables instead of branch-local content.

### Full documentation

See `LOCAL_ONLY_FILES.txt` for the complete list with reasons.
See `scripts/check-local-only.sh` for the automated check script.
See Section 7 for the full merge workflow.

---

*Last updated: 2026-09-05 (CSP ENFORCED + Phase 2 cutover complete: session-only auth, admin_token purged; backend 282 / frontend 302 + 13 e2e)*
