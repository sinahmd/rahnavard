# Rahnavard Automotive (راهنورد خودرو)

A full-stack web application for Rahnavard Automotive, a car import company.

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling

### Backend
- **Django 4.2** with Django REST Framework
- **PostgreSQL 16** database
- **Gunicorn** WSGI server

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** reverse proxy (production)

## Branching Strategy

| Branch | Purpose | Deploys? |
|--------|---------|----------|
| `main` | Production code | ✅ Auto-deploys to rahnavard.co |
| `develop` | Local dev & integration | ❌ CI only |
| `feature/*` | Individual features | ❌ CI only |

**Quick start:**
```bash
git checkout develop      # Switch to dev branch
git pull origin develop   # Get latest changes
# ... make changes ...
git push origin develop   # Push to develop
# When ready for production:
git checkout main && git merge develop && git push origin main
```

👉 See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full workflow guide.

---

## Refactor Status

This repository is mid-refactor under **[docs/SENIOR_REFACTOR_PLAN.md](./docs/SENIOR_REFACTOR_PLAN.md)** — the source of truth for the current architecture direction.

**Done (Phases 0–5):** backend HTML sanitizer + backfill migrations; shared wire types in `frontend/types/`; a single typed browser API boundary (`frontend/lib/api/*`) that all admin pages use; an RSC-only data layer (`frontend/lib/data/*`); the dead legacy clients (`lib/api.ts`, `lib/authFetch.ts`, `withAuth`) deleted; admin authentication moved to **Django session cookies + CSRF** (`sessionid` is httpOnly; the client never attaches an `Authorization` header and never stores a token). Public pages are now **server-rendered**: route groups split public (`(site)`) from admin (`admin/(protected)`), site settings are fetched on the server in `(site)/layout.tsx` (SettingsContext deleted), the home page and car/article listings render their initial content in the server HTML, and listing interactions are client islands whose state derives from the URL `searchParams` (no mirrored React state; back/forward, deep links and shareable URLs preserved). Detail pages fetch through `lib/data/*` and use `notFound()`; `(site)/loading.tsx` and `(site)/error.tsx` provide public boundaries. **Phase 4** rebuilt the admin core: all six list pages share one typed `AdminListPage` with real pagination from the `count`/`page_size` envelope (lists beyond 20 rows were previously unreachable), the dashboard reads one `/api/v1/admin/stats/` endpoint instead of counting page-1 rows, and the 575-line `AdminForm` god-file is split into a transport-free `useAdminForm` hook, per-type field renderers, and `lib/api/formData.ts` as the single home of the multipart `gallery_0..N` conventions — pinned by tests on both the frontend and backend. **Phase 5** polished UI/a11y: repeated section-head/card-image markup extracted into `SectionHead`/`CarCardImage`; admin primitives `PageHeader`/`ErrorState`/`EmptyState`/`ConfirmDialog`; a keyboard-visible skip link on every public page; the five admin `window.confirm()` delete flows replaced by an accessible `ConfirmDialog` (Escape, Tab trap, focus return); one shared `useModalA11y` hook gives the mobile nav, car-filter drawer and consultation modal real focus management; `prefers-reduced-motion` disables autoplay/animations/transitions; status toggles announce with `aria-pressed` and tables carry captions + `scope="col"`. Frontend suite is 301 green with zero act/console warnings; build baselines recorded (`/` 107 kB first load). Fonts are **self-hosted** (`next/font/local`, Vazirmatn + Poppins woff2 committed under `frontend/fonts/`) — no request to fonts.googleapis.com anywhere, which also makes lint fully clean.

**Dual-mode is still active (Phase 2, pre-cutover):** the backend keeps `TokenAuthentication` enabled (ordered before `SessionAuthentication` for rollback) and the login response still carries a legacy `token` field that the new client deliberately ignores. Removing `TokenAuthentication` / `rest_framework.authtoken` requires the staging smoke checklist in [DEVELOPMENT.md §3.6](./DEVELOPMENT.md#36-phase-2--auth-staging-smoke-checklist-session-cookies--csrf) to pass and explicit owner approval — do not treat dual-mode as complete auth migration.

Post-review dual-mode details (final Phase 2 fixes):
- `AuthProvider` is **scoped to the `/admin` routes** — public pages never call `/auth/session/` and anonymous visitors are never redirected to `/admin/login` (the full `admin/(protected)` route-group restructure is Phase 3).
- **Logout is branch-scoped by the actual authenticator**: a session logout destroys only the Django session and **preserves any legacy DRF token**; only a token-authenticated logout deletes the presented token.
- The legacy `localStorage['admin_token']` key is **deliberately left untouched during dual mode** (rollback compatibility); it is purged exactly once in the post-staging, owner-approved `TokenAuthentication`-removal commit.

Remaining phases: **Phase 6** (CSP/hardening, compose consolidation, ADRs, secret-scan CI). Phase 2's token cutover remains gated on the staging smoke checklist and owner approval.

> ⚠️ The older root-level `PHASE1_IMPLEMENTATION_COMPLETE.md` is **superseded and historical** — it describes the pre-refactor scaffolding, not the current state.

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd rahnavard
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start the application:
```bash
docker compose up --build
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- Django Admin: http://localhost:8000/admin/

5. Create a superuser for Django Admin:
```bash
docker compose exec backend python manage.py createsuperuser
```

6. Run migrations:
```bash
docker compose exec backend python manage.py migrate
```

### Local Development (without Docker)

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Project Structure

```
rahnavard/
├── frontend/                 # Next.js application
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── public/               # Static assets
│   └── ...
├── backend/                  # Django application
│   ├── apps/                 # Django apps
│   │   ├── core/             # Core functionality
│   │   ├── cars/             # Cars management
│   │   ├── articles/         # Articles management
│   │   ├── branches/         # Branches management
│   │   └── inquiries/        # Inquiry form
│   ├── config/               # Django settings
│   └── ...
├── nginx/                    # Nginx configuration
├── docker-compose.yml        # Development Docker Compose
├── docker-compose.prod.yml   # Production Docker Compose
└── ...
```

## API Endpoints

### Public API
- `GET /api/v1/cars/` - List active cars
- `GET /api/v1/cars/{slug}/` - Car detail
- `GET /api/v1/articles/` - List published articles
- `GET /api/v1/articles/{slug}/` - Article detail
- `GET /api/v1/branches/` - List active branches
- `POST /api/v1/inquiries/` - Submit inquiry form
- `GET /api/v1/settings/` - Public site settings

### Admin API
- `GET/POST /api/v1/admin/cars/` - Cars management
- `GET/PUT/DELETE /api/v1/admin/cars/{id}/` - Car detail management
- `GET/POST /api/v1/admin/articles/` - Articles management
- `GET/PUT/DELETE /api/v1/admin/articles/{id}/` - Article detail management
- `GET/POST /api/v1/admin/branches/` - Branches management
- `GET /api/v1/admin/inquiries/` - Inquiries list
- `PATCH /api/v1/admin/inquiries/{id}/` - Update inquiry status

## Frontend Routes

- `/` - Home page
- `/cars` - Cars listing
- `/cars/[slug]` - Car detail
- `/articles` - Articles listing
- `/articles/[slug]` - Article detail
- `/admin` - Custom admin dashboard (coming soon)

## SEO Features

- Dynamic metadata with `generateMetadata()`
- Automatic sitemap.xml generation
- robots.txt configuration
- Schema.org structured data
- Open Graph metadata
- Canonical URLs
- Persian/Farsi language support
- RTL layout

## Production Deployment

> **Note:** Production deploys automatically when you push/merge to `main`. See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full workflow.


1. Update environment variables in `.env`:
```bash
DEBUG=0
SECRET_KEY=<strong-secret-key>
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co
DATABASE_URL=postgres://user:password@postgres:5432/rahnavard
```

2. Build and start production containers:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

3. Run migrations:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

4. Create superuser:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

5. Place SSL certificates in `nginx/ssl/`:
- `fullchain.pem`
- `privkey.pem`

## Environment Variables

### Frontend
- `NEXT_PUBLIC_SITE_URL` - Site URL (e.g., https://rahnavard.co)
- `NEXT_PUBLIC_API_URL` - API URL (e.g., http://backend:8000/api/v1)

### Backend
- `DEBUG` - Debug mode (0 or 1)
- `SECRET_KEY` - Django secret key
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `DATABASE_URL` - PostgreSQL connection URL
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of CORS origins
- `CSRF_TRUSTED_ORIGINS` - Comma-separated list of CSRF trusted origins

## License

Proprietary - Rahnavard Automotive
