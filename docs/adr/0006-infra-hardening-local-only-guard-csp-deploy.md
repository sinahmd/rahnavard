# ADR-0006: Infra hardening — local-only guard, CSP report-only, health-gated deploys

**Status:** Accepted (implemented)
**Date:** 2026-09-05 · **Plan ref:** SENIOR_REFACTOR_PLAN §6.A.5, §6.L, §14

## Context

Three infrastructure hazards:

1. `backend/config/settings.py` was listed in `LOCAL_ONLY_FILES.txt` — the
   develop→main merge dance (stash → revert → merge → re-apply) would have
   silently reverted the Phase-2 session-auth/CSRF config on every merge to
   main.
2. The old production CSP allowed `cdn.jsdelivr.net` scripts and Google Fonts
   hosts; fonts are now self-hosted (commit `07e72c8`), so those allowances
   were stale attack surface.
3. Deploys were a blind `down`/`up` cycle: migrations ran inside the
   entrypoint race, nginx could start against dead upstreams, and a failed
   boot still "deployed".

## Decision

1. **Harden the local-only dance instead of retiring it.** A shared guard
   (`scripts/_local_only_guard.sh`, sourced by prepare-merge /
   apply-local-only / check-local-only) refuses any protected production path
   (settings.py, prod compose/Dockerfiles/entrypoint, prod nginx, workflows)
   in `LOCAL_ONLY_FILES.txt` or in a restore backup. settings.py left the list;
   the remaining three local-only files (dev compose, dev nginx conf, dev
   frontend Dockerfile) are genuinely dev-only.
2. **CSP as Report-Only first.** Tightened policy (no CDN script/style/font
   sources; `base-uri`/`object-src`/`form-action` pinned) ships as
   `Content-Security-Policy-Report-Only` in prod and dev nginx. Flip to the
   enforcing header only after a violation-free review window. Note for that
   flip: prod keeps `'unsafe-inline'` for Next's inline bootstrap scripts; the
   dev server additionally needs `'unsafe-eval'` for HMR.
3. **Health-gated deploys** (deploy.yml + scripts/quick-deploy.sh): explicit
   idempotent `migrate` before the new code serves (entrypoint re-runs it as a
   safety net), recreate backend → health gate → frontend → bounce nginx last
   (it caches upstream IPs at startup) → end-to-end health through nginx, with
   log dumps on failure and a non-zero exit.
4. **CI secret-scan**: `scripts/scan-secrets.sh` greps *tracked* files for
   secret formats (never content), so ignored local secrets can't leak and
   docs mentioning variable names don't false-positive.

## Consequences

- The settings.py trap is structurally closed (the guard aborts before any
  destructive step), and CI blocks local-only files in PRs to main.
- Full retirement of the local-only dance (env-driven compose +
  gitignored `docker-compose.override.yml`) remains possible later but is
  deliberately deferred: it would move local dev config into untracked files
  and complicate onboarding for marginal gain now that the hazardous file is
  off the list.

## Alternatives rejected

- Retire the dance immediately (plan §6.L original wording) — the same safety
  is achieved with far less deployment risk; recorded here as the deviation.
- Enforce CSP in the same change — would break on first unmapped source with
  no violation data collected.
