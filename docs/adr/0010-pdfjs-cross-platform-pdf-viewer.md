# ADR-0010: Cross-platform PDF viewer — PDF.js instead of browser-native iframe rendering

**Status:** Accepted — not yet implemented (`IMPLEMENTATION_PLAN.md` Phase 6)
**Date:** 2026-09-19 · **Plan ref:** IMPLEMENTATION_PLAN §4 UX-1, §6 (reconsidered), §8 Phase 6

## Context

The car-detail page shows the catalog PDF through `PdfViewer`
(`frontend/components/car/PdfViewer.tsx`), which embeds a same-origin
`<iframe src={pdfUrl}>` pointing at the `/media/` file. Rendering, controls,
zoom, paging, and error behavior are therefore owned by whichever browser
happens to load the page. The original hardening plan (2026-09-10, UX-1)
accepted this and proposed a capability-detection hybrid
(`navigator.pdfViewerEnabled` + mobile UA heuristic) with an action-card
fallback, and rejected PDF.js as unnecessary complexity.

The product requirement has since changed: the catalog should provide
**approximately the same viewer UI and behavior across modern Chrome, Edge,
Firefox, Safari, iOS, and Android**. A capability-detection hybrid does not
meet that bar — it still delegates the actual rendering to per-browser native
viewers, so the experience differs by browser *by design*, and the fallback
card is a concession rather than a viewer.

## Requirement

One Rahnavard-controlled viewer experience for the catalog PDF on desktop and
mobile, with the PDF remaining a normal file served from `/media/` by
Django/nginx (no backend processing) and the viewer running entirely
client-side.

## Decision

Phase 6 builds the viewer on **PDF.js** (`pdfjs-dist`, the official
distribution), lazy-loaded so the car-detail critical path does not pay for it
before the catalog is opened. `PdfViewer` remains the application-level
abstraction; beneath it PDF.js handles document loading, page rendering
(canvas + text layer), zoom/navigation, and the viewer controls
(navigation, zoom, loading state, error state, download, open-in-new-tab,
fullscreen where appropriate — Persian labels, project styling).

"Consistent" means consistent product behavior and interaction model, not
identical layouts: desktop and mobile may differ in control density while
keeping the same conceptual controls. Native browser PDF rendering is demoted
to escape hatches (open-in-new-tab, direct URL, download).

This supersedes the PDF.js rejection recorded in the 2026-09-10 UX-1
analysis, and makes the one deliberate exception to ADR-0005's
zero-new-runtime-dependencies stance for this single, justified dependency.
The exact `pdfjs-dist` version is chosen during implementation against the
current Next.js 14 / React 18 toolchain and the then-current official PDF.js
release — this ADR deliberately does not pin one.

## Why browser-native iframe rendering is insufficient

The iframe embeds the browser's own PDF viewer. Its controls, zoom model,
paging, dark-mode handling, and failure modes are the browser's, not ours —
they differ across Chrome/Edge/Firefox/Safari and between desktop and iOS/Android,
and the page can neither detect nor compensate for the differences. The
capability-detection hybrid accepted on 2026-09-10 only chose *whether* to show
that uncontrollable viewer; it never made the experience consistent.

## Why PDF.js is acceptable despite the added complexity

- The cost is contained: one client-side dependency, dynamically imported,
  used by exactly one component. No backend change, no worker infrastructure,
  no new data flow — the PDF is still a static `/media/` file.
- The benefit is the requirement itself: a predictable catalog experience on
  every modern browser, with Rahnavard-owned Persian controls.
- Complexity is further bounded by the minimal control set defined in Phase 6
  (no editing, annotation authoring, signing, form filling, or
  document-management features).

## Rejected alternatives

- **Keep the iframe + capability-detection action-card fallback** — cannot
  deliver cross-browser consistency; native rendering remains per-browser.
- **`object`/`embed`** — same native renderer behind a different tag.
- **Forced download everywhere** — worse UX; abandons in-page viewing.
- **Server-side PDF→image conversion** — new backend processing
  infrastructure (rejected as speculative in this cycle) and loses
  text/zoom fidelity.
- **Embedding the full official PDF.js viewer app unmodified** — ships a
  large unstyled surface disconnected from the site's design system; the
  implementation should use PDF.js primitives/architecture with Rahnavard UI.

## Consequences and trade-offs

- **Bundle cost:** PDF.js adds a meaningful client chunk; the lazy-load
  requirement in Phase 6 exists precisely so users who never open the catalog
  pay nothing. Acceptable: the viewer is behind a tab on one page.
- **CSP/worker:** PDF.js runs a Web Worker and may need a narrowly-scoped
  CSP adjustment (the current nginx CSP has no `worker-src`; it falls back to
  `script-src 'self'`). Requirements are verified and applied during
  implementation with the narrowest sources — no wildcards, subject to the
  CSP e2e audit and ADR-0006 discipline.
- **Testing burden grows:** component tests for the viewer states and a
  manual six-browser matrix (Chrome/Edge/Firefox/Safari desktop, iOS Safari,
  Android Chrome), recorded per Phase 6.
- **ADR-0005 exception:** the frontend gains its first new runtime dependency
  since the refactor; future dependency proposals are still governed by
  ADR-0005's "revisit when" logic.

## Scope boundaries

This decision covers the catalog PDF viewer only. It does not authorize a
general-purpose document platform, PDF generation or conversion services,
annotation/document-management features, or any backend PDF processing.
