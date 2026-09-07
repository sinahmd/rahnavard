# Rahnavard Automotive (راهنورد خودرو)

Production full-stack web application for **Rahnavard Automotive**, a car
import company: a Persian/RTL dealership site with an admin-managed catalog,
articles, and branches — public pages rendered by Next.js 14 server
components on top of a Django REST API, deployed by a health-gated
GitHub Actions pipeline.

**Live site:** https://rahnavard.co

[![CI](https://github.com/sinahmd/rahnavard/actions/workflows/ci.yml/badge.svg)](https://github.com/sinahmd/rahnavard/actions/workflows/ci.yml)
[![Deploy](https://github.com/sinahmd/rahnavard/actions/workflows/deploy.yml/badge.svg)](https://github.com/sinahmd/rahnavard/actions/workflows/deploy.yml)
![License](https://img.shields.io/badge/license-All_rights_reserved-red)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black)
![Django 4.2](https://img.shields.io/badge/Django-4.2-44B78B)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1)

## Architecture

```mermaid
flowchart LR
    B["Browser (fa / RTL)"] --> A["Arvan Cloud edge (SSL, CDN)"]
    A --> N["nginx — CSP, rate limits, static/media"]
    N -->|"pages + admin UI"| F["Next.js 14 — RSC public pages, admin SPA"]
    N -->|"/api/ · /django-admin/"| D["Django 4.2 / DRF — session-cookie admin API"]
    F -->|"server-side fetches (RSC)"| D
    D --> P[("PostgreSQL 16")]
```

- **Public pages are React Server Components.** HTML is rendered on the
  server from the database; listing filters and pagination live entirely in
  the URL — no mirrored client state ([ADR-0004](docs/adr/0004-server-rendered-public-pages-url-single-source.md)).
- **Admin auth is httpOnly session cookies + CSRF.** No tokens in the
  browser; the legacy token flow was removed after an automated smoke
  matrix passed ([ADR-0001](docs/adr/0001-session-cookie-auth-for-admin.md)).
- **CSP is enforced** in production and dev nginx, rolled out
  report-only first and flipped only after a zero-violation Playwright
  audit ([ADR-0006](docs/adr/0006-infra-hardening-local-only-guard-csp-deploy.md)).

## Engineering notes

- **Two data boundaries** ([ADR-0003](docs/adr/0003-two-data-boundaries.md)):
  a typed browser API client (`lib/api`) for the admin SPA, and an RSC-only
  data layer (`lib/data`) for server components — a dead legacy client and
  the shared SettingsContext were deleted in the cutover.
- **No unnecessary dependencies** ([ADR-0005](docs/adr/0005-no-new-client-dependencies.md)):
  runtime dependencies are `next`, `react`, `react-dom`, `sharp`. State
  lives in the URL, RSC fetches, and small local state — no Redux/Zustand,
  TanStack Query, React Hook Form, or Zod.
- **Health-gated rolling deploys:** explicit migrate → backend rolling
  restart → backend health gate → frontend → nginx bounced last →
  end-to-end health check through nginx. Any gate fails the deploy loudly.
- **Data safety:** soft deletes with restore endpoints across all models,
  conditional slug-uniqueness constraints, database indexes for listing
  queries, and GDPR-driven removal of stored IP/user-agent from inquiries.
- **Accessibility:** keyboard-visible skip link on every public page, a
  focus-trapped `ConfirmDialog` replacing `window.confirm`, real focus
  management for modals/drawers via one shared hook, `aria-pressed` status
  toggles, table captions with `scope="col"`, and `prefers-reduced-motion`
  support for autoplay/animations.
- **Self-hosted fonts:** Vazirmatn + Poppins committed as woff2 via
  `next/font/local` — zero third-party font requests.
- **Baseline:** `/` ships ~107 kB first-load JS; the 302-test frontend
  suite runs clean (no `act()` or console warnings).

## Quickstart

Prerequisites: Docker & Docker Compose.

```bash
git clone https://github.com/sinahmd/rahnavard.git
cd rahnavard
cp .env.example .env
docker compose up --build -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

| URL | What |
|-----|------|
| http://localhost | Public site (via the dev nginx proxy) |
| http://localhost/admin | Admin UI (Next.js) |
| http://localhost:8000/api/v1/ | Django REST API |
| http://localhost:8000/django-admin/ | Django admin |

First build takes a few minutes; the frontend runs with HMR against the
same nginx routing as production, so the frontend code uses identical
relative API URLs in both environments.

## Testing

| Suite | Command | What it covers |
|-------|---------|----------------|
| Frontend (Jest) | `cd frontend && npm test` | 302 unit/integration tests, clean console |
| Backend (pytest) | `docker compose exec backend pytest` | 283 tests, ~98% coverage, Postgres-backed |
| E2E (Playwright) | `cd frontend && npx playwright test` | Public SSR, CSP violation audit, admin login/session/CSRF matrix — runs against the local Docker stack ([guide](frontend/e2e/README.md)) |

CI runs lint + typecheck + frontend tests + backend tests (with a Postgres
service) + a production build check, plus a secret scan on every push and
a local-only files guard on PRs to `main`.

## Project structure

```
├── frontend/                 # Next.js 14 (App Router, TypeScript, Tailwind)
│   ├── app/(site)/           #   public routes — server-rendered
│   ├── app/admin/            #   admin UI (protected route group)
│   ├── lib/api/              #   typed browser API client (admin)
│   ├── lib/data/             #   RSC-only data layer (public)
│   ├── e2e/                  #   Playwright smoke suite
│   └── fonts/                #   self-hosted Vazirmatn + Poppins
├── backend/                  # Django 4.2 / DRF
│   ├── apps/{cars,articles,branches,inquiries,core,accounts}/
│   └── config/               # settings (session+CSRF auth, throttling, CSP-era hardening)
├── nginx/                    # prod + dev reverse proxy configs (CSP, rate limits)
├── scripts/                  # deploy helpers, secret scan, local-only guards
├── docs/adr/                 # architecture decision records
└── docker-compose{,.prod}.yml
```

## Deployment

| Branch | Purpose | Deploys? |
|--------|---------|----------|
| `main` | Production code | ✅ auto-deploys to rahnavard.co |
| `develop` | Integration | CI only |
| `feature/*` | Work branches | CI only |

```mermaid
flowchart LR
    M["push to main"] --> C["CI: lint · tests · build"]
    C --> S["SSH deploy"]
    S --> MG["explicit migrate"]
    MG --> RS["rolling restart backend"]
    RS --> H1{"backend health gate"}
    H1 --> FE["start frontend"]
    FE --> NB["bounce nginx last"]
    NB --> H2{"end-to-end health check"}
```

Deploy secrets live in GitHub Actions secrets; the server pulls with a
shallow fetch and fails loudly if any health gate trips. Full server
provisioning and ops detail: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## Environment variables

Copy `.env.example` → `.env` and adjust. Key variables:

| Variable | Used by | Example |
|----------|---------|---------|
| `DEBUG` | backend | `1` dev / `0` prod (defaults to off — fail closed) |
| `SECRET_KEY` | backend | a real random value in prod (placeholder refuses to boot) |
| `ALLOWED_HOSTS` | backend | `rahnavard.co,www.rahnavard.co` |
| `DATABASE_URL` | backend | `postgres://user:password@postgres:5432/rahnavard` |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | backend | `https://rahnavard.co` |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_URL` | frontend | `https://rahnavard.co` / `/api/v1` |

## Architecture decisions

| ADR | Decision |
|-----|----------|
| [0001](docs/adr/0001-session-cookie-auth-for-admin.md) | Session-cookie auth for the admin API (token auth removed) |
| [0002](docs/adr/0002-route-structure-and-guard-placement.md) | Route structure: `(site)` group vs `admin/(protected)` guard placement |
| [0003](docs/adr/0003-two-data-boundaries.md) | Two data boundaries: browser client vs RSC data layer |
| [0004](docs/adr/0004-server-rendered-public-pages-url-single-source.md) | Server-rendered public pages; URL as the single source of truth |
| [0005](docs/adr/0005-no-new-client-dependencies.md) | No new client dependencies (state, forms, validation, codegen) |
| [0006](docs/adr/0006-infra-hardening-local-only-guard-csp-deploy.md) | Infra hardening: local-only guard, CSP rollout, health-gated deploys |

## Roadmap

- Upgrade Django 4.2 → 5.2 LTS (4.2 is past extended security support)
- Run the Playwright e2e suite in CI against a compose stack; publish a
  coverage badge
- `manage.py seed_demo` so a fresh clone boots with believable demo data
- Evaluate Next.js 16 and `sharp` 0.35 dependency bumps

## License

Proprietary — © Rahnavard Automotive. All rights reserved; see
[LICENSE](LICENSE). This repository is public for portfolio and review
purposes; no reuse is granted. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md) before opening issues.
