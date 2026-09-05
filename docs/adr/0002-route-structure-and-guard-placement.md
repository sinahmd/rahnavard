# ADR-0002: Route structure — `(site)` group + `admin/(protected)`, login outside the guard

**Status:** Accepted (implemented)
**Date:** 2026-09-04 · **Plan ref:** SENIOR_REFACTOR_PLAN §6.E, §17#2

## Context

`app/admin/layout.tsx` contained both the auth guard (redirect to
`/admin/login` when unauthenticated) and the sidebar shell, and special-cased
`pathname === '/admin/login'` to escape its own guard. Guard and login were
entangled by a pathname hack that breaks the moment any unauthenticated admin
route is added.

## Decision

```
app/(site)/…                    # public app — no providers, no auth
app/admin/layout.tsx            # client: <AuthProvider>{children}</AuthProvider> — providers ONLY
app/admin/login/page.tsx        # outside the guard; uses useAuth().login()
app/admin/(protected)/layout.tsx  # guard + sidebar — the ONLY place auth-gating lives
app/admin/(protected)/page.tsx …  # URLs stay /admin/...
```

AuthProvider sits at `admin/layout.tsx` so **both** login and protected pages
share `useAuth()`; the guard lives one level deeper so login never passes it.

## Consequences

- No `pathname` special cases anywhere; "unauthenticated admin pages" is a
  first-class pattern (password reset etc. can be added as siblings of login).
- Public pages ship no auth code: zero `/auth/session/` calls, no redirect risk.
- `(site)` isolates public chrome and enables server-fetched settings (ADR-0004).

## Alternatives rejected

- A root `(admin)` group wrapping login + protected — would add a layout that
  renders nothing shared; login (standalone full-screen) and protected (sidebar)
  share no chrome.
- Keeping the pathname hack — couples guard to routing knowledge.
