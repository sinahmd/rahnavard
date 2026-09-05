# ADR-0003: Two data boundaries — `lib/api` (browser) and `lib/data` (RSC)

**Status:** Accepted (implemented)
**Date:** 2026-09-03 · **Plan ref:** SENIOR_REFACTOR_PLAN §6.B, §17#13

## Context

Three API paths existed: a dead `lib/api.ts` class (only its own tests imported
it — ~700 lines of false-confidence tests), `lib/authFetch.ts` reading
`localStorage` per call, and raw `fetch` in `AuthContext`. Errors were raw
`Response` objects hand-rolled at every call site; typing was `any`.

## Decision

- **`lib/api/*`** — the single browser boundary: `http.ts` (JSON envelope,
  `ApiError{message, fieldErrors}`, CSRF header on unsafe methods, single 401 →
  `/admin/login` handler) + typed endpoint modules per domain that own wire
  serialization (`FormData`, `gallery_0..N`, boolean → `'true'/'false'`).
- **`lib/data/*`** — the single RSC boundary: server-only fetchers using
  `BACKEND_INTERNAL_URL`, retry/backoff + timeout, media-URL normalization in
  one place, `listQuery.ts` parse/build helpers shared by server shells and
  islands.
- The two never import each other and never share auth state. `lib/data` never
  reads cookies/localStorage; `lib/api` is never imported by server components.
- Wire types are defined once in `frontend/types/`.

## Consequences

- Every admin write maps server errors to fields in one place; empty
  `catch {}` blocks are gone from admin code.
- The dead `lib/api.ts` + its test file were deleted the moment the
  replacement existed; `withAuth` + its tests deleted as pure dead weight.

## Alternatives rejected

- Axios / interceptor stacks / DTO-mapping classes — no need at this scale.
- One shared "isomorphic" client — would drag CSRF/cookie concerns into RSC
  code that must stay anonymous (see ADR-0001).
