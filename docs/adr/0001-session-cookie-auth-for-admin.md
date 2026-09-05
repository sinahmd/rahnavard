# ADR-0001: Session-cookie auth for the admin API

**Status:** Implemented — cutover complete (session-only, 2026-09-05)
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
- **Cutover (2026-09-05):** the dual-mode window is closed —
  `TokenAuthentication` and `rest_framework.authtoken` are removed, login
  returns exactly `{user}`, and the stale `localStorage['admin_token']` key is
  purged once on the first admin bootstrap. The `authtoken_token` TABLE was
  never dropped (rows are inert; optional one-off SQL cleanup deferred).
- **Behavioral delta:** DRF issues a 401 challenge only through authenticators
  providing a `WWW-Authenticate` header (Token/Basic). With
  SessionAuthentication alone, unauthenticated requests to
  permission-protected endpoints answer **403, not 401**; the admin bootstrap
  (`fetchSession`) treats both statuses as "unauthenticated".
- Logout is session-only: `logout(request)` destroys the Django session.

## Alternatives rejected

- httpOnly cookie carrying the DRF token with a custom auth class — re-implements
  what sessions already provide (expiry, rotation, password-hash sync).
- Keep localStorage tokens with client-side XSS hardening only — treats the
  symptom; the token remains JS-readable.
