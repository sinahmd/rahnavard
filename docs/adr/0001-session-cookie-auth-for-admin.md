# ADR-0001: Session-cookie auth for the admin API

**Status:** Accepted (implemented, dual-mode cutover pending)
**Date:** 2026-09-04 · **Plan ref:** SENIOR_REFACTOR_PLAN §6.A, §17#1

## Context

The admin API authenticated with DRF tokens stored in `localStorage['admin_token']`,
read/written from three modules. DRF tokens never expire and are reused across
logins; any XSS on the same origin yields permanent admin credentials.

## Decision

Admin browser→API requests authenticate with the Django **session cookie**
(`sessionid`, httpOnly, SameSite=Lax, 8h age) plus `X-CSRFToken` on unsafe
methods. `csrftoken` is deliberately NOT httpOnly — the client must read it to
echo it. Bootstrap via `@ensure_csrf_cookie` on login and `GET /auth/session/`.
Public mutation views (inquiry POST) declare `authentication_classes = []` so a
logged-in admin's session can never trigger CSRF there. No cookie forwarding
from Next.js server code: public RSC pages only call anonymous public GETs.

## Consequences

- No credential is readable by JS; expiry/rotation/logout are server semantics.
- Same-origin by construction (nginx serves app + API in prod and dev) — no
  CORS, no `SameSite=None`, no `credentials` flags.
- Dual-mode transition: `TokenAuthentication` stays FIRST in
  `DEFAULT_AUTHENTICATION_CLASSES` so legacy clients bypass CSRF until cutover.
  Removal is gated on the DEVELOPMENT.md §3.6 staging smoke + owner approval.
- Logout branches on the presented credential: session logout preserves the
  legacy token; token logout deletes the token.

## Alternatives rejected

- httpOnly cookie carrying the DRF token with a custom auth class — re-implements
  what sessions already provide (expiry, rotation, password-hash sync).
- Keep localStorage tokens with client-side XSS hardening only — treats the
  symptom; the token remains JS-readable.
