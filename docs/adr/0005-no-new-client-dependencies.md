# ADR-0005: No new client dependencies (state, forms, validation, codegen)

**Status:** Accepted
**Date:** 2026-09-03 · **Plan ref:** SENIOR_REFACTOR_PLAN §6.D, §17#6–10

## Context

The refactor touched state ownership, forms, and API typing — the points where
Redux/Zustand, TanStack Query, React Hook Form, Zod, and OpenAPI codegen are
usually introduced. Each was evaluated against the actual failure modes of
this codebase (single-operator admin, small collections, per-field validation
with backend authority, no exposed OpenAPI schema).

## Decision

Add none of them.

| Temptation | Decision | Revisit when |
|---|---|---|
| Redux / Zustand / Jotai | No — no cross-component state beyond admin auth (a context) | A demonstrated propagation problem |
| TanStack Query | No — public reads are RSC fetches; admin lists live in `AdminListPage` | Multi-user cross-tab editing, interdependent optimistic updates, large collections |
| React Hook Form | No — transport-free `useAdminForm` (injected `load`/`submit`) solves the real problem | Forms become dynamic or cross-field |
| Zod | No — per-field validation + backend-authoritative errors | Same as RHF |
| OpenAPI codegen | No — no schema exported; ~25 hand-written types + serializer-drift tests in `types/` | OpenAPI exposed AND a second API client appears |

## Consequences

- Zero new runtime dependencies in the frontend (deps remain `next`, `react`,
  `react-dom`, `sharp`); the form split and list consolidation were mechanical
  extractions of existing duplication, not rewrites.
- `useAdminForm` never imports `lib/api` — it is a pure state machine, tested
  with `renderHook` without HTTP.
