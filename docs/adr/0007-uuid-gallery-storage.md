# ADR-0007: UUID-based gallery storage (supersedes the slug-based deferral)

**Status:** Accepted — implementation pending (`IMPLEMENTATION_PLAN.md` Phase 3)
**Date:** 2026-09-16 · **Plan ref:** IMPLEMENTATION_PLAN §4 (Storage / correctness), §7.1, §7.2, §11

## Context

Car gallery images are stored as a `JSONField` of URL strings on `Car`, with the
files written to disk by `GalleryField.save_gallery_files`
(`backend/apps/cars/serializers.py`) using the scheme `{slug}_gallery_{idx}{ext}`.

On 2026-09-05 that scheme was reviewed and accepted as **deferred** debt
(recorded in `DEVELOPMENT.md` §3.9): each *active* car has a unique slug (partial
unique index), so distinct active cars cannot collide, the filenames are
readable and stable, and public media does not require unpredictable URLs. The
one identified edge case was slug reuse after soft-deletion or a slug rename.

The pre-launch hardening cycle (`IMPLEMENTATION_PLAN.md`, 2026-09-10) re-decided
this question. The project is **pre-launch**: admin usage is development/testing
only and there is no valuable customer dataset, so a structural storage migration
is cheap now and expensive once real gallery content and external references
exist. The slug scheme's failure mode is not a collision but **identity**: the
URL changes when the slug changes, and a soft-deleted car's slug can be reused
by a different car, which would make previously-published gallery URLs point at
the wrong entity. That is a correctness problem, not a cosmetic one.

## Decision

Gallery files are stored at **immutable, identity-derived paths**:

```
cars/{car_id}/gallery/{uuid}{ext}
```

- The path derives from the car's **primary key**, not mutable content, so a
  slug rename does not move or invalidate any file.
- A fresh UUID per uploaded file makes soft-delete + recreate collision-free and
  makes reordering a no-op for URLs.
- The representation **stays a `JSONField` of URL strings**. A separate
  `GalleryImage` model was evaluated and rejected — the array is simpler and
  sufficient; a relational media library is explicitly out of scope.
- Filesystem writes are coordinated with the database by temp-dir writes plus
  atomic `shutil.move` with exception cleanup. **`transaction.atomic()` does not
  roll back filesystem writes and must never be treated as a filesystem
  rollback mechanism.** The full failure-case matrix is in
  `IMPLEMENTATION_PLAN.md` §7.2; it is not duplicated here.

The migration is a data migration that renames existing files on disk and
rewrites the JSONField URLs, and must be idempotent (`IMPLEMENTATION_PLAN.md`
§11). Residual risk: a process crash mid-operation can leave a temp directory or
partial final files on disk — mitigated by the `cleanup_orphan_media`
management command (Phase 5), which is the documented, accepted mitigation.

## Consequences

- Gallery URLs survive slug changes; a soft-deleted car's slug being reused by a
  new car cannot repoint an existing URL.
- `{slug}_gallery_{idx}` naming is legacy: the current code still uses it until
  Phase 3 lands. Any doc that reads as current policy for the slug scheme is
  superseded by this ADR (see `DEVELOPMENT.md` §3.9).
- Orphan-file cleanup becomes a real requirement rather than a hypothetical one;
  it lands with Phase 5.
- The `test_distinct_active_cars_do_not_collide_gallery_files` pin describes the
  old scheme's guarantee and is replaced by the migration's own tests in Phase 3.
- Filesystem migrations are **not** equivalent to DB transactions — the data
  migration must handle disk state explicitly alongside the DB rewrite.
