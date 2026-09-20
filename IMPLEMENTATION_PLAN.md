# Rahnavard Implementation Plan — Pre-Launch Hardening

**Status:** In progress — Phases 1–9 complete; Phase 6 cross-browser matrix + tmp-file cleanup pending
**Date:** 2026-09-10
**Cycle:** Pre-client-delivery hardening

---

## Context

Rahnavard is a Persian/RTL automotive import company website — Next.js 14 RSC frontend, Django 4.2/DRF backend, PostgreSQL 16, Docker, deployed to Arvan Cloud via health-gated GitHub Actions. The senior refactor (Phases 0–6) is complete: session-cookie auth, server-rendered public pages, URL-driven listing state, CSP enforced, ADRs written, 282 backend tests / 302 frontend tests / 13 e2e passing.

**This plan exists because** the refactor left real gaps before client delivery: login has no brute-force protection, gallery uploads have no magic-byte validation, gallery filesystem writes are not coordinated with DB transactions, there is no error monitoring or automated backup, and the image pipeline serves full-resolution originals with no fallback handling. The project is **pre-launch** — admin usage is development/testing only, there is no valuable customer dataset — so justified structural migrations (gallery storage, image variants) are cheap now and expensive later.

This is the authoritative source for this implementation cycle. Architectural rationale continues to live in `docs/adr/`; deployment procedures in `DEPLOYMENT_GUIDE.md`; developer workflow in `DEVELOPMENT.md`; project/agent conventions in `CLAUDE.md` / `DEVELOP_RULES.md`. This plan cross-references those rather than duplicating them.

---

## 1. Purpose

This document governs one implementation cycle: pre-launch security, storage-correctness, observability, backup, image-pipeline, and minor UX/SEO work for Rahnavard.

It is the single authoritative plan for this cycle. A future coding agent should be able to read this file, understand the approved scope, phase order, dependencies, rejected scope, and execution contract, and implement exactly one phase at a time.

Architectural decisions that outlive this cycle will be recorded as ADRs under `docs/adr/` during implementation. This plan documents only the decisions necessary to execute the phases.

---

## 2. Current State (repository evidence)

### Stack
- **Backend:** Django 4.2, DRF, PostgreSQL 16, environ-based settings (`backend/config/settings.py`).
- **Frontend:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind. Runtime deps: `next`, `react`, `react-dom`, `sharp` only (`frontend/package.json`).
- **Infra:** Docker Compose (dev `docker-compose.yml`, prod `docker-compose.prod.yml`), nginx reverse proxy, Arvan Cloud edge (SSL/CDN).
- **CI/CD:** `.github/workflows/{ci,deploy,release}.yml` — lint+test+build+e2e on every push; health-gated rolling deploy on `main`; tag-driven releases.

### Authentication
Session-cookie + CSRF only (token auth removed, ADR-0001). `sessionid` httpOnly, `csrftoken` JS-readable (echoed as `X-CSRFToken`). Admin scoped to `app/admin`; public pages never call `/auth/session/`.

### Public architecture
Public pages are React Server Components under `app/(site)/`. URL `searchParams` are the single source of truth for listing filter/sort/page state (ADR-0004). ISR revalidation at 60s (`frontend/lib/data/*.ts`).

### Admin architecture
Browser-only SPA under `app/admin/(protected)/`. Two data boundaries (ADR-0003): `lib/api` (browser, admin) vs `lib/data` (RSC, public). Shared `AdminListPage` + split `AdminForm` (`useAdminForm` + `fields.tsx`).

### Image architecture (current)
- Models with images: `Car` (`main_image` ImageField, `gallery` JSONField of URL strings, `og_image`), `Article` (`cover_image`, `og_image`), `Branch` (`map_image`), `SiteSettings` (`logo`, `default_og_image`), `HeroSlide` (`image`), `WhyFeature` (`icon`).
- `ImageValidator` (`backend/apps/core/validators.py`) checks size (5MB), extension (.jpg/.jpeg/.png/.webp), and MIME `content_type` — but **not magic bytes**. Applied to all image fields via `extra_kwargs` in admin serializers.
- `catalog_file` (Car) is a `FileField` with only PDF extension validation — no `ImageValidator`.
- Gallery files written via raw `open()` in `GalleryField.save_gallery_files()` (`backend/apps/cars/serializers.py:27-57`), filename scheme `{slug}_gallery_{counter}{ext}`. **Outside any DB transaction; no orphan cleanup.**
- Frontend `OptimizedImage` wraps `next/image` with `unoptimized` for media URLs. No `onError` handler. No blur/LQIP. Placeholder UI only for null `src`.
- nginx serves `/media/` with `expires 7d; Cache-Control public`. No WebP content negotiation.

### Testing baseline
Backend: **282 passed / 98.32% cov**. Frontend: **302 jest**, zero warnings. E2E: **13 Playwright specs**. All checks run inside Docker via `docker compose exec`.

### Known weaknesses (this cycle's scope)
1. `login_view` is `AllowAny` with **no throttle**.
2. `ImageValidator` checks extension + MIME but **not magic bytes**.
3. `catalog_file` has **no validator beyond PDF extension**.
4. Gallery writes are raw FS outside any DB transaction.
5. **No orphan file cleanup** mechanism.
6. Gallery filenames are slug-based.
7. **No error monitoring** (zero Sentry/LogRocket).
8. **No uptime monitoring**.
9. Backup script exists but no automation.
10. **No blur/LQIP**, no `onError` fallback on images.

---

## 3. Project Constraints (permanent for this cycle)

- **No** financing calculator, Celery, Redis, PWA/service worker, background-job infrastructure, central media library, full i18n, content versioning, optimistic locking, bulk admin actions, draft/review/publish workflow.
- **No** speculative enterprise observability (Grafana/Loki/Prometheus/OpenTelemetry) unless concrete need appears.
- **No** speculative service-layer architecture or module splits for theoretical cleanliness.
- **No** broad architecture rewrites — preserve the completed refactor.
- Prefer incremental, reversible changes; existing project conventions; small diffs.
- Every change must earn its complexity.
- Owner convention: all verification runs on local Docker via `docker compose exec`.

---

## 4. Approved Work

Verified against the actual repository. Each item is justified, not assumed.

### Security
- **Login brute-force protection** — Add `ScopedRateThrottle` (`throttle_scope = "login"`, rate `5/minute` per IP). *Real brute-force exposure on the single admin entry point.*
- **Magic-byte validation** — Read first bytes, validate JPEG/PNG/WebP signatures. Extension+MIME alone is client-spoofable.
- **Upload size validation** — Already enforced. **Keep as-is.**
- **Image dimension validation** — Min 800×600, max 4000×3000, max aspect 3:1. Pre-launch is the time to enforce quality standards.

### Storage / correctness
- **UUID gallery storage** — Migrate from `{slug}_gallery_{counter}` to `cars/{car_id}/gallery/{uuid}{ext}`. Slug-based breaks on rename, collides on soft-delete+recreate. Pre-launch migration cost near-zero.
- **DB/filesystem consistency** — Temp-dir writes + atomic move + exception cleanup. See §7.2 for failure cases.
- **Orphan cleanup** — Management command `cleanup_orphan_media` (dry-run default, `--delete` to remove).

### Observability
- **Application error monitoring** — Sentry (backend `sentry-sdk`, frontend `@sentry/nextjs`). DSN via env var. Release tracking via git SHA.
- **External uptime monitoring** — UptimeRobot (free tier, HTTP check on `/api/v1/settings/`, email alert).

### Backup
- **Automated DB + media backup** — Cron job (daily 3 AM), 30-day retention, offsite rsync, checksum verification. Existing `scripts/backup.sh` enhanced.

### Image pipeline
- **WebP conversion** — Convert JPEG/PNG → WebP at upload (keep original).
- **Thumbnails** — Small (400×300), medium (800×600), large (1600×1200).
- **LQIP** — Tiny (10×10) WebP stored as separate file (not base64 in DB).
- **Responsive images** — Remove `unoptimized`; let Next.js `<Image>` generate `srcSet`.
- **Image fallback** — `onError` handler for broken images.

### SEO / UX
- **Listing breadcrumbs** — Already on detail pages. Add to `/cars` and `/articles`.
- **Per-page canonical URLs** — Add to car/article detail `generateMetadata`.

### UX / Cross-platform (added 2026-09-10 — five client-facing issues, verified against the repo)

Each issue below was inspected in the live code before being accepted; statuses reflect what the repository actually shows, not the original report.

**UX-1 — PDF catalog viewer is inconsistent across browsers (P1) — RE-SCOPED 2026-09-19 to a PDF.js-based viewer.**
`PdfViewer` (`frontend/components/car/PdfViewer.tsx`) embeds `<iframe src={pdfUrl}>` and delegates rendering entirely to each browser's own PDF viewer. Repository facts (verified end-to-end): the catalog URL is same-origin `/media/...` (normalized by `lib/data/car.ts`), nginx (dev + prod) serves `/media/*.pdf` with the standard `application/pdf` MIME type and **no** `Content-Disposition` header, CSP `frame-src` allows the same-origin frame, and `expires 7d` caching is acceptable for immutable uploads. The failure is the *delegation itself*: each browser embeds its own viewer with different controls, zoom, paging, and failure behavior inside the iframe — the product cannot make the catalog experience predictable across Chrome/Edge/Firefox/Safari/iOS/Android, and there is no deliberate fallback path. (The original report framed this as "unusable on Android"; that specific browser-capability claim is **not carried forward unverified** — what is verified is that native iframe rendering is outside Rahnavard's control and behaves differently per browser.) The component currently ships **without any test** — nothing under `components/car/__tests__/` covers it.
- **Approved solution:** a Rahnavard-owned viewer built on **PDF.js** (`pdfjs-dist`), lazy-loaded, inside the existing `PdfViewer` abstraction. Details in §8 Phase 6 and ADR-0010.
- **Alternatives:** capability-detection hybrid with action-card fallback (rejected 2026-09-19 — still delegates the actual rendering to per-browser native viewers, so consistency is never achieved); `object`/`embed` (same native renderer, no benefit); forced download everywhere (worse UX); server-side PDF→image conversion (new backend infra — rejected as speculative). The former rejection of PDF.js as unnecessary complexity is **superseded** — see §6.
- **Affected files:** `frontend/components/car/PdfViewer.tsx` (+ a test for it — none exists today), possibly a small CSP/worker asset addition if verified necessary during implementation. nginx/Django delivery model unchanged.

**UX-2 — `font-poppins` applied to Persian content (P1) — PARTIALLY CONFIRMED.**
The car detail `<h1>` (`app/(site)/cars/[slug]/page.tsx:182`) and price `<p>` (:194, which renders `fa-IR` **Persian digits**) carry `font-poppins`; the same class sits on the price spans in `CarCard.tsx:72`, `FeaturedCars.tsx:72`, `RelatedCarsSlider.tsx:76`. Visual Poppins rendering was **NOT reproduced**: Poppins ships latin-subset only and the utility's stack falls back to `var(--font-vazirmatn)` (tailwind.config.ts), so Persian text already paints in Vazirmatn. The defect is the broken typography contract: Persian-language elements are semantically labeled Latin-font, weight/line-height resolution is incidental, and any future Poppins subset change would silently regress the rendering.
- **Recommended solution:** typographic convention — `font-poppins` is for **Latin-script content only** (brand/model English strings such as CarCard's brand/model spans); Persian content uses the default `font-vazir` stack. Remove the class from the four price spans + the detail `<h1>`; document the convention in `lib/fonts.ts`.
- **Scope check (done):** article titles, branch names, section heads, and footer/settings strings already use the default stack — the five spans above are the complete affected set.
- **Affected files:** `app/(site)/cars/[slug]/page.tsx`, `components/car/CarCard.tsx`, `components/home/FeaturedCars.tsx`, `components/car/RelatedCarsSlider.tsx`, `lib/fonts.ts` (comment), + tests.

**UX-3 — Hero swipe stalls mid-drag with repeated touchmove Intervention warnings (P1) — CONFIRMED.**
`HeroSlider.tsx` uses `touch-action: pan-y` (correct: vertical page scroll stays native) and a non-passive native `touchmove` listener whose handler calls `e.preventDefault()` once horizontal swiping is detected. Race condition: when the gesture has slight vertical drift, the browser commits to panning **before** the JS direction lock (10 px, `|dy|>|dx|`) fires; from then on `touchmove.cancelable === false`, `preventDefault()` is a no-op, and the browser logs the `[Intervention]` warning on every subsequent move — the drag freezes at the last offset and `touchend` sees a sub-threshold delta, so the transition never completes. This exactly matches the reported symptom.
- **Recommended solution:** keep the touch-event architecture and `pan-y` (no library, no pointer-events rewrite — pointer events offer no better scroll arbitration). Make the gesture cancelability-safe: direction-lock with hysteresis matched to the browser's slope decision, keep updating the drag offset from move events, and call `preventDefault()` **only when `e.cancelable`** (the guard both removes the warning and stops fighting an in-progress scroll). `touchend` commit/rollback from the last drag offset is retained.
- **Affected files:** `frontend/components/home/HeroSlider.tsx` + tests.
- **Regression risks:** desktop behavior untouched (buttons only); vertical scroll behavior governed by unchanged `touch-pan-y`.

**UX-4 — Mobile menu has no reachable close control (P1) — CONFIRMED.**
The hamburger (`Header.tsx`) does morph into an X and flips its `aria-label` to «بستن منو» when open — but the open `MobileNav` panel (`z-50`, later in DOM) overlays the header and **covers the toggle**; `useModalA11y` traps Tab inside the panel, excluding the toggle from the tab order. Escape and overlay-tap close, but on a phone there is no visible, pointer-reachable close target inside the opened menu.
- **Recommended solution:** add an explicit close button inside the panel's top row (visually consistent with the drawer design), `aria-label="بستن منو"`, placed first so `useModalA11y`'s initial focus lands on it; focus return and Escape already work through the existing hook. Keep the hamburger morph (it is the toggle's open-state affordance); do not create a second toggle outside the panel.
- **Affected files:** `frontend/components/layout/MobileNav.tsx` + tests.

**UX-5 — Persian digit display layer (P1) — CONFIRMED (inconsistent today).**
Prices already render Persian digits via `Intl.NumberFormat('fa-IR')` (CarCard, detail page, CarFilters), but: branch/Footer phone numbers render raw Latin digits from the API; `ActiveFilters`/`CarFilters` build labels like «2 میلیارد» via `toFixed(0)` (Latin); pagination numerals are Latin; and any Latin digits typed inside Persian names display as-is. There is no centralized formatter. The stored/API/form values are correct everywhere — this is purely a display-layer gap.
- **Recommended solution:** one pure, SSR-safe helper module `lib/format/persianDigits.ts` (`toPersianDigits(value: string | number): string`) applied **only at display sites**. Persian digits for: visitor-facing phone numbers, price/filter labels, counts, digits inside Persian-facing names, pagination numerals. Latin preserved for: production year (all sites — Gregorian), `tel:` hrefs (centralize the Persian→Latin inversion Footer currently does inline), URLs/slugs/IDs, API payloads, form inputs, admin tables (internal), JSON-LD/structured data and metadata. Mixed strings («بنز E 200»): format the whole displayed string — Latin letters are unaffected, digits become Persian; year values never pass through the helper.
- **Affected files:** new `lib/format/persianDigits.ts`; display sites `Branches.tsx`, `Footer.tsx`, `ActiveFilters.tsx`, `CarFilters.tsx`, `Pagination.tsx`, car name/price spans; + unit and component tests.

---

## 5. Deferred Work (post-delivery)

- Social sharing buttons (WhatsApp/Telegram/copy-link)
- Branch hours/services (no product justification)
- Advanced backup verification (automated restore tests)
- WebP content negotiation in nginx
- AVIF support (limited browser support)
- Per-page canonical on listing pages (root canonical sufficient)

---

## 6. Rejected Work

Financing calculator, Celery, Redis, PWA/service worker, background-job infrastructure, central media library, full i18n, speculative enterprise observability stack, unnecessary relational media system (GalleryImage model), unnecessary service-layer abstraction, LQIP as base64 in PostgreSQL.

**PDF.js — reconsidered and now APPROVED for Phase 6 (2026-09-19).** The 2026-09-10 UX-1 analysis rejected PDF.js as unnecessary complexity for a capability-detection fallback. That rationale is **superseded**: the product requirement changed from "provide a fallback where native PDF rendering is unavailable" to "provide a largely consistent cross-platform viewer experience", and only a Rahnavard-controlled renderer meets it. PDF.js is now the approved implementation direction for Phase 6 (see §8 Phase 6 and ADR-0010). This approval is narrowly scoped to the catalog viewer: it does **not** authorize a general-purpose document platform, PDF generation/conversion services, annotation/document-management features, or other PDF infrastructure. The project's complexity-minimization principle still governs — the viewer ships as one lazy-loaded client-side component with the minimum control set defined in Phase 6.

---

## 7. Architecture Decisions Relevant to This Plan

### 7.1 Gallery storage — UUID-based (DO NOW)

Migrate gallery filenames from `{slug}_gallery_{counter}{ext}` to `cars/{car_id}/gallery/{uuid}{ext}`. Stable under slug rename; no collision under soft-delete+recreate; reorder doesn't change URLs. Representation stays JSONField (array of URL strings). Separate `GalleryImage` model rejected — JSONField simpler, works.

**Rationale:** `docs/adr/0007-uuid-gallery-storage.md` — this supersedes the
2026-09-05 decision that accepted slug-based filenames as deferred debt
(recorded in `DEVELOPMENT.md` §3.9). The ADR holds the reasoning and the
rejected alternatives; this section holds only the executable summary.

### 7.2 DB + filesystem consistency — temp-dir + atomic move + exception cleanup

> **CRITICAL INVARIANT:** `transaction.atomic()` does NOT roll back filesystem writes. It must NEVER be treated as a filesystem rollback mechanism. Re-verify against actual code immediately before implementing.

The chosen strategy:

1. Write uploaded files to a **temporary directory** (`tempfile.mkdtemp()`).
2. Open a DB transaction (`transaction.atomic()`).
3. Save the model instance.
4. **Atomically move** (`shutil.move`, same-filesystem) each temp file to the final UUID path.
5. Update the gallery JSONField with final URLs.
6. On any exception: delete temp dir + any files moved to final location, then re-raise. Track moved files in a list for deterministic cleanup.

**Failure case behavior:**
- **A. DB fails after temp writes:** Files never moved; temp dir deleted; transaction rolls back. No orphans.
- **B. File write fails before DB commit:** Exception; DB never starts; temp dir deleted. No orphans.
- **C. Second file fails after first succeeds (in temp):** Exception; temp dir deleted including first file. No orphans.
- **D. Update replaces old gallery, DB fails:** Old files untouched; new files in temp; temp deleted; old gallery JSONField unchanged (transaction rolled back). No data loss.
- **E. Process crashes halfway:** Temp dir left on disk; final location may have partial files. The `cleanup_orphan_media` command (Phase 5) is the documented, accepted residual risk mitigation.

### 7.3 Image processing — upload-time generation, file-based variants

Original preserved for backup/regeneration. Variants generated at upload time (WebP + thumbnails + LQIP) via Pillow (already a dependency: `Pillow>=10.0`). Variants stored as files on disk. Next.js `<Image>` generates `srcSet`. Nginx serves `/media/` with `expires 7d` (unchanged). No AVIF, no on-the-fly processing, no sorl/easy-thumbnails.

### 7.4 Monitoring — Sentry + UptimeRobot

Sentry (backend + frontend). DSN via env var; release tracking via git SHA. UptimeRobot free tier, 5-min interval, HTTP check on `/api/v1/settings/`. No Grafana/Loki/Prometheus/OTel — no concrete need.

---

## 8. Final Implementation Phases

Each phase independently implementable and reviewable. Do NOT combine phases into one pass.

### PHASE 1 — Security Hardening
- **Objective:** Close brute-force and malicious-upload gaps.
- **Tasks:**
  - `backend/apps/accounts/views.py`: add `ScopedRateThrottle` to `login_view` (`throttle_scope = "login"`).
  - `backend/config/settings.py`: add `"login": "5/minute"` to `DEFAULT_THROTTLE_RATES`.
  - `backend/apps/core/validators.py`: add magic-byte validation (JPEG/PNG/WebP signatures); add dimension validation (min 800×600, max 4000×3000, max aspect 3:1); add `ImageValidator` dimension params; add `PDFValidator` class.
  - `backend/apps/cars/serializers.py`: apply `PDFValidator` to `catalog_file`.
- **Dependencies:** none.
- **Tests:** `test_login_throttled_after_5_attempts`; `test_image_validator_rejects_spoofed_mime`; `test_image_dimensions_validated`; `test_catalog_file_validated`.
- **Verification:** Backend tests; manual: 6 rapid logins → 429; upload PNG with JPEG bytes → 400.
- **Rollback:** revert validator/views diff; throttle is additive.

### PHASE 2 — Monitoring + Backup
- **Objective:** Production visibility and a real backup path.
- **Scope:** Sentry (backend + frontend); UptimeRobot setup; automated backup cron; checksum verification.
- **Dependencies:** none (independent of app phases).

### PHASE 3 — Gallery UUID Migration + Storage Correctness
- **Objective:** Stable gallery URLs + atomic DB/FS writes.
- **Re-verify:** Immediately before implementing, re-read `backend/apps/cars/serializers.py` (`GalleryField.save_gallery_files`) and verify the §7.2 failure-case design against actual code.
- **Dependencies:** Phase 1 (validator should be in place before new upload paths land).

### PHASE 4A — Backend Image Storage Pipeline
- **Objective:** Generate and persist image variants at upload time.
- **Scope (backend only):** variant architecture; WebP generation; thumbnail generation; LQIP generation; storage paths; gallery representation/metadata.
- **Dependencies:** Phase 3.

### PHASE 4B — Frontend Image Delivery
- **Objective:** Consume backend variants for responsive delivery, blur placeholders, priority loading, error fallback.
- **Scope (frontend only):** `OptimizedImage` changes; responsive delivery; blur placeholder; priority loading; error fallback; all affected image consumers.
- **Dependencies:** Phase 4A.

### PHASE 5 — UX/SEO Polish + Orphan Cleanup
- **Objective:** Listing breadcrumbs, per-page canonical, orphan cleanup command.
- **Dependencies:** Phase 4B.

### PHASE 6 — Cross-platform PDF Catalog (UX-1, P1) — redesigned 2026-09-19 around PDF.js
- **Objective:** A Rahnavard-owned, cross-browser-consistent catalog viewer: approximately the same viewer UI and behavior across modern Chrome, Edge, Firefox, Safari, iOS, and Android, instead of delegating rendering to each browser's native PDF viewer.
- **Architecture:** `PdfViewer` remains the application-level abstraction; beneath it, a **lazy-loaded PDF.js** (`pdfjs-dist`) handles document loading, page rendering, zoom/navigation, the text layer, and the viewer controls. The PDF itself stays a normal file served from `/media/` by Django/nginx — no backend change, the viewer runs entirely client-side.
  ```
  PdfViewer (Rahnavard UI + Persian controls)
     │
     ▼
  lazy-loaded PDF.js (pdfjs-dist)
     ├── document loading        ├── page rendering (canvas + text layer)
     ├── zoom / navigation       └── viewer controls (toolbar, states)
  ```
- **Loading strategy:** PDF.js must be **dynamically imported only when the catalog viewer is actually needed** — it must not sit on the car-detail critical path for users who never open the catalog. Exact mechanism (`next/dynamic`, `import()`, chunking) is decided during implementation after repository verification.
- **UI ownership:** Rahnavard owns the viewer UI. Implementation may use PDF.js rendering primitives and/or the official PDF.js viewer architecture as appropriate, but the UX is intentionally integrated into the Rahnavard frontend (Persian labels, project styling) — not an embedded unrelated viewer. Required control subset: page navigation, zoom, loading state, error state, download, open-in-new-tab (safe escape hatch to native rendering), fullscreen where appropriate, responsive desktop/mobile controls. **Out of scope:** PDF editing, annotation authoring, signing, form filling, or any document-management features.
- **Responsive behavior:** "consistent" means consistent product behavior and interaction model, not identical layouts — desktop and mobile may differ in control density/layout while retaining the same conceptual controls.
- **Browser strategy:** no capability detection as core architecture — `navigator.pdfViewerEnabled` and mobile UA heuristics are **not required** for choosing the viewer. Native browser PDF rendering survives only as escape hatches: open-in-new-tab, direct URL, download.
- **Dependencies/packages:** implementation will likely require the official `pdfjs-dist` distribution; the exact version is selected and verified **during implementation** against the current Next.js 14 / React 18 / TypeScript toolchain and the then-current official PDF.js release (current API verified 2026-09-19: promise-based `getDocument`, `page.getViewport`/`page.render`, ESM `.mjs` builds, worker via `GlobalWorkerOptions.workerSrc`). Do not pin a version from this plan.
- **CSP/security consideration (record, don't change now):** PDF.js runs a Web Worker and renders via canvas/blob URLs. Current CSP (`nginx.conf`/`nginx.dev.conf`) has **no `worker-src`** (falls back to `script-src 'self'`) but does allow `frame-src 'self' blob: data:` and `img-src … blob:`. During implementation, verify the actual worker/asset requirements (e.g. worker via `script-src 'self'` + `worker-src 'self'`, or a `new URL(…, import.meta.url)` worker asset) and adjust the CSP with the **narrowest verified sources** — no wildcards, no broad weakening. Any change goes through the CSP audit (e2e `csp-audit.spec.ts`) and ADR-0006 discipline.
- **Tests:** unit/component — viewer initialization; PDF.js loading/error state; loading indicator; successful document render; page navigation; zoom behavior; download/open-in-new-tab controls; responsive/mobile control behavior where practical; cleanup/unmount (worker/canvas/render task teardown); PDF fetch failure; worker/render-layer init failure. Plus a manual cross-browser matrix recorded in the phase report covering **Chrome desktop, Edge desktop, Firefox desktop, Safari macOS, iOS Safari, Android Chrome** with the actual browser/device versions available during implementation. E2E: CSP audit must stay green (no new violations from worker/asset loading).
- **Rollback:** revert `PdfViewer.tsx` to the unconditional same-origin iframe (the component keeps its current props interface, so the page call-site is unaffected); remove the lazy-loaded viewer chunk and any narrowly-scoped CSP addition.
- **Dependencies:** Phase 4B (same page is reworked there); independent of Phases 5, 7, 8, 9. **Decision recorded in `docs/adr/0010-pdfjs-cross-platform-pdf-viewer.md`**.

### PHASE 7 — Mobile Navigation Close Control (UX-4, P1)
- **Objective:** Every state of the mobile menu has a visible, labeled, pointer- and keyboard-reachable close control.
- **Scope:** close button inside the `MobileNav` panel (first focusable, `aria-label="بستن منو"`); `useModalA11y` focus-trap/Escape/focus-return behavior preserved; hamburger morph retained.
- **Tests:** extend MobileNav tests — close button rendered when open, click closes, focus returns to the toggle; existing keyboard/focus tests stay green.
- **Rollback:** remove the button.
- **Dependencies:** none beyond Phase 4B ordering (avoids concurrent header edits); independent of Phases 5, 6, 8, 9.

### PHASE 8 — Hero Slider Touch Interaction (UX-3, P1)
- **Objective:** Intentional horizontal swipes complete the slide transition; vertical scrolling stays native; no touchmove Intervention warnings.
- **Scope:** `HeroSlider.tsx` gesture logic only — cancelability-guarded `preventDefault`, direction lock with hysteresis, drag offset maintained from move events, `touchend` commit/rollback. No library, no pointer-events rewrite, `touch-pan-y` retained.
- **Tests:** unit tests for direction lock/threshold/cancelable guard with synthetic touch events; Playwright mobile-emulation swipe spec asserting the active slide index changes on a horizontal swipe and the page still scrolls vertically.
- **Rollback:** revert the gesture handler.
- **Dependencies:** none beyond Phase 4B ordering; independent of Phases 5, 6, 7, 9.

### PHASE 9 — Persian Typography + Digit Display Layer (UX-2 + UX-5, P1)
- **Objective:** Persian text uses the Persian font by contract; visitor-facing numbers render Persian digits without touching stored/API/form values.
- **Scope:** remove `font-poppins` from Persian-content spans (detail h1 + price, CarCard/FeaturedCars/RelatedCarsSlider prices) and document the Latin-only convention in `lib/fonts.ts`; new `lib/format/persianDigits.ts` helper applied at display sites (phones, filter labels, pagination, Persian-facing names); year/`tel:`/URLs/IDs/JSON-LD/admin stay Latin; centralize Footer's inline Persian→Latin `tel:` inversion into the helper module. **Combined into one phase** because the two work items share the display-layer concern and the same files (price spans).
- **Tests:** helper unit tests (digits, mixed strings, idempotence on Persian input, year never passed); component tests for phone/price/pagination rendering; class-assertion tests pinning `font-poppins` removal.
- **Rollback:** revert span classes; delete helper + call sites (pure display layer, zero data impact).
- **Dependencies:** none beyond Phase 4B ordering; independent of Phases 5, 6, 7, 8.

---

## 9. Dependency Graph

```
PHASE 1 (Security)               [no prerequisites]
    │
    ▼
PHASE 3 (Gallery UUID +          [depends on Phase 1 — validator in place]
         Storage Correctness)      RE-VERIFY the FS/DB consistency design here (§7.2)
    │
    ▼
PHASE 4A (Backend Image           [depends on Phase 3 — UUID paths + atomic writes]
         Storage Pipeline)          backend-only; public serializers stay backward-compatible
    │
    ▼
PHASE 4B (Frontend Image          [depends on Phase 4A — backend serves variant-object shape]
         Delivery)                 frontend-only; CSP audit must stay green
    │
    ├────────────┬──────────────┬──────────────┬──────────────┐
    ▼            ▼              ▼              ▼              ▼
PHASE 5       PHASE 6        PHASE 7        PHASE 8        PHASE 9
(UX/SEO +     (PDF catalog,  (MobileNav     (Hero touch,   (Typography +
 Cleanup)      UX-1 P1)       close, UX-4)   UX-3 P1)       fa digits, UX-2+5)
```

**Independent:** Phase 1 and Phase 2 have no dependencies on each other and can run in parallel.
**Mandatory chain:** Phase 3 → Phase 4A → Phase 4B.
**Post-4B lane:** Phases 5–9 all depend only on 4B (they touch frontend files 4B also reworks — ordering avoids concurrent edits, not logical coupling) and are mutually independent; execute them one at a time per §12. Phases 6–9 are frontend-only and touch no backend code. Phase 6 note: it adds one lazy-loaded client dependency (`pdfjs-dist`) to the viewer component only — ADR-0005's zero-runtime-deps decision is superseded for this single, justified dependency (recorded in ADR-0010); no other phase introduces dependencies and the two data boundaries (ADR-0003) are untouched.

---

## 10. Testing and Quality Gates

Run **inside Docker** (owner convention, CLAUDE.md §1):

| Check | Command |
|-------|---------|
| Backend tests | `docker compose exec -T backend python -m pytest -q` |
| Backend check | `docker compose exec -T backend python manage.py check` |
| Migrations check | `docker compose exec -T backend python manage.py makemigrations --check --dry-run` |
| Frontend tests | `docker compose exec -T frontend npm test -- --runInBand` |
| Typecheck | `docker compose exec -T frontend npx tsc --noEmit` |
| Lint | `docker compose exec -T frontend npm run lint` |
| Build | `docker compose run --rm --no-deps frontend npm run build` |
| E2E (Phases 3–5) | `cd frontend && npx playwright test` |

**Baseline to preserve:** backend ≥ 98% coverage, frontend 302+ tests, zero warnings, tsc clean, lint clean, `next build` green.

---

## 11. Migration and Recovery Rules

### Gallery UUID migration (Phase 3)
Data migration renames existing files on disk from `{slug}_gallery_{n}.ext` to `cars/{car_id}/gallery/{uuid}.ext` and rewrites JSONField URLs. Idempotent — re-running detects already-migrated URLs. Rollback = restore from backup.

### Gallery JSONField shape change (Phase 4A)
Add variant URLs alongside originals in the gallery JSONField. Add a `regenerate_image_variants` management command for post-deploy backfill. Public serializers stay backward-compatible across 4A→4B boundary. Rollback: revert frontend to `unoptimized` + original URLs.

**Storage migration rule:** filesystem migrations are NOT equivalent to DB transactions. The gallery UUID migration touches both DB (JSONField) and disk (file renames) — the data migration must handle disk state explicitly.

---

## 12. Agent Execution Contract

Every coding agent working on this project must follow these rules:

1. Read `IMPLEMENTATION_PLAN.md` before implementation.
2. Read relevant existing documentation and ADRs before changing those areas.
3. Implement ONE phase at a time.
4. Never automatically continue to another phase — STOP after each.
5. Before editing, state the exact phase scope.
6. **Before editing, re-read the relevant repository code** and verify the plan still matches reality. For Phase 3 specifically, re-read `GalleryField.save_gallery_files` and re-verify the §7.2 filesystem/DB consistency design — `transaction.atomic()` must never be treated as a filesystem rollback mechanism.
7. Identify any contradiction between the plan and the repository BEFORE making changes. If found, STOP and report it.
8. Do not introduce rejected technologies or features (§6).
9. Do not perform unrelated refactors.
10. Do not rewrite working architecture merely for stylistic preference.
11. Prefer existing project conventions and dependencies.
12. Keep diffs focused.
13. Add or update tests appropriate to the change.
14. Run relevant tests/checks before declaring completion.
15. Inspect `git diff` before stopping.
16. Review the change as a senior engineer before reporting.
17. **Documentation rule:** after each phase, update ONLY the authoritative documents actually affected by the implementation. Do not blindly update every `.md` file. Do not duplicate documentation.
18. Report what changed and what remains.
19. STOP after completing the assigned phase.

---

## 13. Phase Completion Report Contract

After each implementation phase, report:

- Phase completed
- Files changed
- Behavior changed
- Tests run + test results
- Build/typecheck/lint results where applicable
- Migrations created/applied
- Documentation updated
- Architectural decisions made (ADR created/updated if applicable)
- Known risks
- Follow-up work
- Whether safe to proceed to next phase

Then STOP.

---

## 14. Definition of Done

1. **Security:** Login throttled (5/min/IP); magic-byte validation on all image fields + `catalog_file`; dimension validation enforced.
2. **Storage correctness:** Gallery uses UUID paths; writes are atomic; no orphans on failure (Cases A–D tested).
3. **Monitoring:** Sentry configured (backend + frontend, DSN via env, PII scrubbed, release tracking); UptimeRobot active; backup automated (daily cron, 30-day retention, checksum).
4. **Image pipeline:** WebP + thumbnails + LQIP generated at upload (Phase 4A); responsive delivery + blur placeholder + `onError` fallback on all components (Phase 4B).
5. **UX/SEO:** Breadcrumbs on listing pages; per-page canonical URLs on detail pages; orphan cleanup command available (dry-run default).
6. **Quality gates:** All tests pass; no regression; tsc clean; lint clean; `next build` green; backend coverage ≥ 98%.
7. **Documentation:** Updated where implementation changed documented behavior; new ADR(s) for gallery UUID + image pipeline + monitoring decisions; `IMPLEMENTATION_PLAN.md` marked complete.
8. **UX correctness (added 2026-09-10; PDF item re-scoped 2026-09-19):** the PDF catalog renders through the Rahnavard-owned, lazy-loaded PDF.js viewer with approximately the same UI and behavior on desktop Chrome, Edge, Firefox, and Safari and on iOS Safari and Android Chrome — loading/error states, navigation, zoom, download, and open-in-new-tab escape hatch included — while the catalog file itself is still served unchanged from `/media/` with no backend involvement; the opened mobile menu has a visible, labeled close control with focus-trap behavior intact; hero horizontal swipes complete with zero `[Intervention]` touchmove warnings while vertical page scroll stays native; Persian content never carries `font-poppins`; visitor-facing numbers use Persian digits via `lib/format/persianDigits` while years, `tel:` hrefs, URLs/IDs, API payloads, and JSON-LD remain Latin.
9. **Production verification:** manual smoke on local Docker.

---

## 15. Change Log

| Date | Change |
|------|--------|
| 2026-09-10 | Plan created. Pre-launch state recognized — admin is dev/test only. |
| 2026-09-10 | Repository reviewed against proposed objectives. `InquiryCreateView` dedup already done (commit `ca11540`) — removed from scope. |
| 2026-09-10 | UUID gallery storage: DEFER → DO NOW. Pre-launch migration cost near-zero. |
| 2026-09-10 | Image pipeline: minimal → professional (WebP + thumbnails + LQIP + responsive + fallback). |
| 2026-09-10 | DB/filesystem consistency: temp-dir + atomic `shutil.move` + exception cleanup. |
| 2026-09-10 | Monitoring: moved to Phase 2 (independent of app code). |
| 2026-09-10 | Security: added dimension validation; applied `ImageValidator` to `catalog_file`. |
| 2026-09-10 | Phase 4 split into 4A (backend) and 4B (frontend) — independently reviewable passes. |
| 2026-09-10 | Strengthened §7.2: explicit re-verification before Phase 3; `transaction.atomic()` must never roll back FS writes. |
| 2026-09-10 | Strengthened §12: per-phase pre-edit re-read; contradiction-report-before-change rule. |
| 2026-09-10 | Added §4 UX-1..UX-5 — five client-facing issues verified against the repo (PDF viewer fallback, font-poppins scope, hero touch race, MobileNav close control, Persian digit display layer). New Phases 6–9 in a parallel post-4B lane; §9 graph, §14 DoD updated. Priorities: all P1. Plan-only change — no application code touched. |
| 2026-09-16 | Reconcile docs with this plan: the 2026-09-05 slug-scheme deferral (`DEVELOPMENT.md` §3.9) is marked SUPERSEDED by §7.1; the UUID-gallery rationale is recorded in `docs/adr/0007-uuid-gallery-storage.md` and referenced from §7.1 instead of being duplicated. |
| 2026-09-18 | **Phase 1 (Security Hardening) complete** — committed `5888307`. Login throttled at 5/minute/IP with the scope on the view class; magic-byte + dimension validation; `PDFValidator` on `catalog_file`. Two deviations from this plan, both justified: throttle counters moved to a shared file cache (per-process counters doubled the effective rate under gunicorn's two workers) and `SiteSettings.logo` / `WhyFeature.icon` got non-content dimension profiles so legitimate branding/icon assets are not rejected. Verified in local Docker: backend 323 passed / 98.54% cov, `check` and `makemigrations --check` clean. |
| 2026-09-18 | **Phase 2 (Monitoring + Backup) landed** — Sentry on both tiers with scrubbing and a same-origin tunnel (keeps CSP `connect-src 'self'`), UptimeRobot documented, `backup.sh`/`restore.sh` rewritten around staged, checksum-verified, versioned sets with 30-day retention and offsite publish-after-verify. Decisions recorded in `docs/adr/0008-monitoring-and-backup.md`; operational steps in `DEPLOYMENT_GUIDE.md`; phase report in `DEVELOPMENT.md` §3.12. DSNs, the uptime monitor and the cron install remain owner activation steps. |
| 2026-09-18 | Documentation reconciliation: stale test counts corrected in `README.md`, `CLAUDE.md` §1 and `DEVELOPMENT.md` §3.5 (dated 2026-09-05 records left intact, current numbers added alongside). |
| 2026-09-18 | **Phase 3 (Gallery UUID + Storage Correctness) complete** — gallery files now live at `cars/{car_id}/gallery/{uuid}{ext}` via staged writes inside `MEDIA_ROOT` plus `shutil.move`, with the created paths tracked so a failed gallery write deletes exactly the files that upload created; data migration `cars/0009_gallery_uuid_paths` renames existing files and rewrites the JSONField URLs idempotently (reverse = no-op; roll back from a backup). One deliberate deviation from §7.2: because the path derives from the primary key, the row is written first and the staging write happens *inside* the transaction, so a failed write leaves a row that never commits instead of a transaction that never started — the §7.2 A–D guarantees (no orphans, no data loss) are unchanged and now covered by `apps/cars/test_gallery_storage.py` plus `TestGalleryUuidMigration`. `docs/adr/0007` marked implemented; verified in local Docker: backend 330 passed / 98.59% cov, `check` + `makemigrations --check` clean, frontend untouched (307 tests, tsc/lint clean, public + CSP e2e 4/4). |
| 2026-09-18 | **Phase 4A (Backend Image Storage Pipeline) complete** — upload-time variants for `Car.main_image`, `Car.gallery` entries, `Article.cover_image`, `HeroSlide.image`: WebP re-encode (q82), aspect-preserving thumbnails fitted inside 400×300/800×600/1600×1200, 10px WebP LQIP; originals preserved byte-for-byte. Variants are filesystem-derived in a deterministic sibling `.variants/<stem>/` directory — no schema change, no migration. Generation runs after DB commit and failures are contained (row-without-variants = the pre-4A state; regen command repairs), the deliberate mirror of Phase 3's abort-on-failure policy. Public serializers expose additive read-only `*_variants` fields that read disk truth and return `null` until backfilled — byte-identical pre-backfill responses, `main_image`/`gallery` keep their string shapes across 4A→4B. `regenerate_image_variants` (dry-run default, `--apply`/`--force`/`--strict`) backfills, idempotent and gap-filling. Decision: `docs/adr/0009`. Verified in local Docker: backend **359 passed / 98.62% cov**, `check` + `makemigrations --check` clean; frontend untouched (307 tests, tsc/lint clean). Owner deploy step: run `--apply` once after deploy. |
| 2026-09-19 | **Phase 6 redesigned around PDF.js (plan-only change — no application code touched).** Reason: the product requirement changed from "fallback where native PDF rendering is unavailable" to "approximately the same viewer UI and behavior across modern Chrome, Edge, Firefox, Safari, iOS, and Android" — only a Rahnavard-controlled renderer can meet it. Phase 6 now specifies a lazy-loaded `pdfjs-dist` viewer inside the existing `PdfViewer` abstraction (loading strategy, UI ownership, responsive behavior, browser strategy, CSP/worker considerations, full test plan); `navigator.pdfViewerEnabled`/UA detection and native iframe embedding are no longer the architecture — native rendering is demoted to an escape hatch (open-in-new-tab / direct URL / download). PDF.js moved from rejected to approved (§6 note); UX-1 re-scoped with unverified browser-capability claims removed; DoD item 8 updated; decision recorded in `docs/adr/0010-pdfjs-cross-platform-pdf-viewer.md`. No viewer implementation performed in this pass. |
| 2026-09-19 | **Phase 5 (UX/SEO Polish + Orphan Cleanup) complete** — committed `8b55dee`. `/cars` and `/articles` render the same breadcrumb pattern as the detail pages (home → section) inside the SSR'd explorer islands, so the first HTML carries them; car/article detail `generateMetadata` emits an absolute per-page canonical from `NEXT_PUBLIC_SITE_URL` (listing shells stay canonical-free per §5); new `cleanup_orphan_media` command (dry-run default, `--delete`) classifies orphans across all six media-owning models — FileField replacement orphans (the case `apps/cars/test_gallery_storage.py` explicitly deferred here), Phase 3 `.gallery-upload-*` staging leftovers (§7.2 Case E), and Phase 4A variant sets of dead originals plus crash-mid-write dot-tmp files (ADR-0009) — while soft-deleted rows (`with_deleted()`), the SiteSettings singleton and unknown dotfiles are never touched, and emptied directories are pruned non-recursively. No new ADR: no architectural decision, ops/SEO only. Verified in local Docker: backend **373 passed / 98.12% cov** (≥ the §10 98% gate; the dip from 98.62% is the new command's error-only branches), `check` + `makemigrations --check` clean; frontend **326 passed / 42 suites**, tsc clean, lint clean. Owner deploy steps: run `regenerate_image_variants --apply` (the still-pending 4A backfill), then a `cleanup_orphan_media` dry-run and review before any `--delete`. |
| 2026-09-20 | **Phases 7, 8, 9 implemented (committed 2026-09-20)** — one pass per phase, sequential. Phase 7: explicit close button inside the MobileNav panel (`بستن منو`, first focusable, initial-focus pin updated deliberately). Phase 8: cancelability-safe gesture handling in HeroSlider (1.2 slope hysteresis, drag accumulates on non-cancelable moves, `preventDefault` only when `e.cancelable`); unit tests + CDP real-touch mobile-emulation e2e (tmp spec pending owner decision on permanence); pre-existing edge rubber-band asymmetry documented, not changed. Phase 9: `lib/format/persianDigits.ts` (`toPersianDigits`/`toLatinDigits`) applied at Footer/Branches phones, CarFilters/ActiveFilters labels, Pagination numerals (aria-labels stay Latin); `font-poppins` removed from Persian h1/price spans with the convention documented in `lib/fonts.ts`. Plan-scope corrections recorded: FeaturedCars/RelatedCarsSlider have no own price spans (they embed CarCard) — two price sites, not four. Verified in Docker: jest **382 passed / 49 suites, zero act/console warnings**, tsc clean (except the known tmp Phase 6 spec error), lint clean, `next build` green. IDM host-level PDF interception (idmwfp driver) documented as an environmental hazard affecting production visitors; viewer error card is the correct graceful path. |
