# ADR-0008: Sentry error monitoring and automated, verified backups

**Status:** Accepted (implemented; activation is manual — see `DEPLOYMENT_GUIDE.md` §Monitoring / §Backup and Restore)
**Date:** 2026-09-18 · **Plan ref:** IMPLEMENTATION_PLAN §4 (Observability, Backup), §7.4, Phase 2

## Context

The pre-launch review found two operational blind spots:

1. **No error visibility.** Nothing captured a Django 500, a Next.js server
   render failure, or a browser exception. Failures were only discoverable by a
   visitor reporting them, or by reading container logs after the fact. There
   was also no uptime check on the public API.
2. **Backups existed but were not a backup path.** `scripts/backup.sh` was a
   manual, unautomated script with no integrity verification, no retention
   policy, no offsite copy and no restore rehearsal; it wrote a dump and a media
   tar and assumed the operator would notice if either was truncated.

`IMPLEMENTATION_PLAN.md` §6 explicitly rejects a speculative observability
stack (Grafana/Loki/Prometheus/OpenTelemetry) for lack of a concrete need, and
§7.4 selects Sentry + UptimeRobot. This record holds the reasoning behind the
implementation; the operational steps live in `DEPLOYMENT_GUIDE.md`.

## Decision

### 1. Sentry for application errors, both tiers, opt-in

`Sentry` receives Django exceptions (`sentry-sdk[django]`) and Next.js server +
browser exceptions (`@sentry/nextjs`). Reporting is **disabled by default and
enabled by configuration**: an empty `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
means the SDK is never initialised, so a clone without DSNs behaves exactly as
before and no SDK build-time failure can block a deploy.

### 2. Scrubbing is deny-by-default, not a filter list

Errors are captured; context is not. Backend (`settings.py`) sets
`send_default_pii=False`, `include_local_variables=False`,
`max_request_body_size="never"`, disables breadcrumbs, and runs a `before_send`
that deletes `request`, `user`, `breadcrumbs`, `extra` and stack-frame `vars` —
and that **drops the event entirely** if the request payload carries a
password/phone/token/secret key. The frontend mirrors it in `lib/sentry.ts`
(`scrubSentryEvent`). Tracing, profiling and session replay stay off
(`traces_sample_rate=0`).

### 3. Browser transport goes through a same-origin tunnel

`withSentryConfig`'s `tunnelRoute` (`/monitoring-tunnel`) proxies envelopes
through the Next.js server. This is what makes Sentry compatible with the
**enforced** CSP: `connect-src 'self'` in `nginx/*.conf` stays untouched
instead of being widened to the Sentry ingest host. The built-in tunnel
supports Sentry-hosted ingest; a self-hosted Sentry would need a separately
reviewed transport.

### 4. No source maps, no auth token, release = git SHA

Source-map upload is disabled, so no Sentry auth token exists in the repo, CI
secrets or images. The release identifier is the deployed git SHA, exported by
`deploy.yml` and `scripts/quick-deploy.sh` and embedded into the browser bundle
at build time.

### 5. UptimeRobot for API availability, acknowledging its limit

A free-tier HTTP monitor on `/api/v1/settings/` (5-minute interval, email
alert). It proves the API answers; it does **not** prove the frontend renders.

### 6. Backups: staged, checksum-verified, versioned, published atomically

`scripts/backup.sh` writes into a staging directory, proves each artifact
(`gzip -t`, `tar -tzf`), records a `sha256sum` manifest plus a
`rahnavard-backup-v1` `COMPLETE` sentinel, and only then renames the set into
place atomically. Database credentials are resolved **inside** the postgres
container (`docker compose exec`), never by sourcing the project `.env`.
Offsite copies (`OFFSITE_HOST`/`OFFSITE_DIR`) are uploaded to a `.<set>.partial`
directory and renamed only after `sha256sum -c` passes remotely. Retention is
30 days and applies **only** to directories matching the set-name pattern,
carrying the versioned marker, and whose manifest still verifies exactly.

`scripts/restore.sh` accepts nothing else: it pins the exact manifest file
list, refuses symlinks and archive members that are absolute, contain `..`, or
are not files/directories, requires an explicit `yes`, stops the application
services for the duration, and leaves them stopped on failure rather than
half-live. Backup and restore share one `flock`, so they can never overlap.

## Consequences

- **Activation is manual and verifiable.** DSNs, the UptimeRobot monitor and the
  cron installation are owner steps; the code is inert until they happen.
  `scripts/rahnavard-backup.cron` is deliberately a template that nothing
  installs automatically.
- **Filters can be silently wrong.** A `before_send` that drops events with
  sensitive request data could hide a real error; the trade-off is accepted
  because the alternative is storing credentials in a third party, and the plan
  requires PII scrubbing. Verification after activation must confirm synthetic
  errors actually arrive.
- **A failed backup is only as visible as its cron mail.** The script exits
  non-zero and prints diagnostics; routing that output to a monitored mailbox
  is part of the installation procedure, not something code can guarantee.
- **The dump and the media tar are taken live**, so a set is not a cross-volume
  snapshot. The script states this on stdout; operators needing a tighter
  point-in-time pair must quiesce writes first.
- **Restores are format-locked.** Sets produced by the pre-2026-09 `backup.sh`
  carry no manifest and are refused, so restoring one is a manual procedure.
- Backups contain `.env` (secrets): `umask 077`, `0600` files and a private
  destination are requirements, not defaults to be relaxed.

## Alternatives rejected

- **Grafana/Loki/Prometheus/OpenTelemetry** — no concrete need at this scale
  (plan §6); Sentry plus UptimeRobot covers "did it break and what threw".
- **Full APM / tracing / session replay** — cost and PII surface with no
  consumer of the data yet; `traces_sample_rate` is pinned to 0.
- **Required (non-optional) DSNs** — would make every build and local run depend
  on a third-party service being configured.
- **Uploading source maps** — needs a Sentry auth token in CI and in the build;
  stack frames are readable enough without it at this size.
- **Posting envelopes straight to the Sentry host** — requires widening CSP
  `connect-src` to a third-party origin, trading a hardened header for
  convenience.
- **A public crash-reporting endpoint** — an unauthenticated write path with
  no owner.
- **A `systemd` timer or a second backup mechanism** instead of the committed
  cron template — one documented, reviewable path beats two.
- **Keeping the old single-shot `backup.sh`** with a separate verification tool —
  verification that can be skipped is verification that will be skipped.
