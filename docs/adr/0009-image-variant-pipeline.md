# ADR-0009: Upload-time image variant pipeline (WebP + thumbnails + LQIP)

**Status:** Accepted — implemented 2026-09-18 (`IMPLEMENTATION_PLAN.md` Phase 4A)
**Date:** 2026-09-18 · **Plan ref:** IMPLEMENTATION_PLAN §4 (Image pipeline), §7.3, §8 Phase 4A, §11

## Context

Every content image (`Car.main_image`, `Car.gallery` entries, `Article.cover_image`,
`HeroSlide.image`) is served as the uploaded original: full resolution, original
format, no small placeholder. The plan's image-pipeline work requires WebP
conversion, three bounded thumbnails (400×300 / 800×600 / 1600×1200), a 10px
LQIP, original preservation, and stable paths — with on-the-fly processing,
AVIF, nginx content negotiation, LQIP-as-base64-in-PostgreSQL, and
sorl/easy-thumbnails all explicitly rejected (plan §6, §7.3).

## Decision

Variants are generated **at upload time** with the already-required Pillow
dependency, strictly after `ImageValidator` accepts the bytes:

- One WebP re-encode at the original dimensions (quality 82), three
  aspect-preserving `thumbnail()` variants fitted inside the bounding boxes
  (no cropping, no upscaling — 4:3 fills a box exactly, portraits shrink to
  fit), and a 10px-wide WebP LQIP (quality 40).
- The **original is preserved byte-for-byte**; variants are pure extras.
- Variant files live next to the original in a sibling dot-directory,
  `media/…/.variants/<stem>/`, derived **deterministically from the source
  path** — so nothing about variants is persisted in the database, no schema
  change and no migration exists, a regenerated set lands at the same URLs,
  and the regen command can be re-run safely (it skips complete sets,
  gap-fills partial ones, `--force` rebuilds in place).
- Public serializers expose variants through **additive read-only fields**
  (`main_image_variants`, `gallery_variants`, `cover_image_variants`,
  `image_variants`) that read disk truth only and return `None`/`null` when a
  set does not exist — responses before backfill are byte-identical to the
  pre-4A API, and `main_image`/`gallery` keep their string shapes across the
  4A→4B boundary.
- `regenerate_image_variants` (dry-run default, `--apply`, `--force`,
  `--strict`) backfills pre-existing images after a deploy and repairs gaps.

### Failure policy: contained, not aborting

`transaction.atomic()` never rolls back the filesystem (ADR-0007). Variant
files are *derived extras*: a row that commits without variants is exactly the
pre-4A state. Generation therefore runs **after DB commit** (`on_commit` in a
`post_save` receiver per model; the gallery serializer calls the same worker
for the URLs its upload created) and **failures are logged, not propagated** —
an upload must not 500 because Pillow or the disk hiccuped after the row was
durably stored. `generate_variants()` itself is all-or-nothing per source
image (encode everything in memory, write via temp name + `os.replace`,
remove exactly what this call created on failure), so a failed or crashed
generation never leaves a half-replaced set over a previous complete one. The
regen command repairs any gap. This is a deliberate policy difference from
Phase 3's gallery writes: there the path is part of the stored data, so
failure aborts the request; here it cannot lose data, so it degrades.

## Consequences

- Pillow's default decompression-bomb guard stays active as defense-in-depth;
  every upload already passed dimension validation (≤12MP).
- EXIF orientation is baked into variant pixels (`ImageOps.exif_transpose`);
  non-RGB/L modes are flattened to RGB.
- A process crash mid-write can leave at most one dot-tmp file in a `.variants`
  directory — the plan's accepted Case-E residual risk, cleaned by Phase 5's
  `cleanup_orphan_media`, which recognizes variant artifacts by their
  `.variants` path segment.
- Existing images have no variant directory until the regen command runs;
  the API degrades to `null` variants meanwhile.
- Rejected alternatives recorded here for posterity: AVIF (browser support),
  on-the-fly resizing (unbounded request-time cost), nginx content
  negotiation (plan §7.3 defers WebP negotiation), LQIP base64 in the DB
  (row bloat; plan §6), a relational variant model (schema cost for derived,
  recomputable data).
