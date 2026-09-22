"""Upload-time image variant generation (Phase 4A).

Plan: `IMPLEMENTATION_PLAN.md` §7.3, §8 Phase 4A, §11; rationale:
`docs/adr/0009-image-variant-pipeline.md`.

What this module does
---------------------
For a *content* image (Car.main_image, Car.gallery entries, Article.cover_image,
HeroSlide.image) an upload generates, with the already-required Pillow
dependency and strictly after `ImageValidator` has accepted the bytes:

- a WebP re-encode of the original dimensions (quality 82),
- three aspect-preserving thumbnails — bounded by 400x300, 800x600,
  1600x1200 boxes (`Image.thumbnail` fits the image INSIDE the box without
  cropping or upscaling: a 4:3 landscape fills it exactly, a 2:3 portrait
  yields 225x300 for the small box),
- an LQIP: a 10px-wide WebP (quality 40) whose base64 data URL is meant for
  `blurDataURL`; the tiny file itself is what is stored on disk.

The original file is preserved byte-for-byte; variants are extras.

Where variants live
-------------------
Next to the original, in a dot-prefixed sibling directory:

    media/cars/abc123.jpg                     → the original, untouched
    media/cars/.variants/abc123/{sm,md,lg}.webp
    media/cars/.variants/abc123/lqip.webp

Paths derive deterministically from the original's path, so nothing about
variants needs to be persisted in the database — a regenerated set lands at
the same URLs, `regenerate_image_variants` can be re-run safely, and
`cleanup_orphan_media` (Phase 5) can recognize variant directories by name.
The dot prefix keeps the media tree human-readable. nginx serves `/media/`
via `alias` with no dotfile rule (nginx/nginx.conf §media), so the files are
reachable; URLs are `MEDIA_URL`-prefixed like every other media URL.

Failure semantics
-----------------
`generate_variants()` is all-or-nothing per source image: every encoded
output is staged in memory first, files are written to a temp name in the
final directory and `os.replace`d into place; any failure removes exactly the
files this call created and re-raises. It never deletes the original, and a
partial failure leaves the previous state (including a previous, complete
variant set) intact. A crash mid-write can leave at most one dot-tmp file —
the documented, accepted Case-E residual risk, cleaned by Phase 5's command.

Backward compatibility
----------------------
Stored/API URLs are unchanged: `main_image` and the gallery JSONField keep
their string shapes, and images that predate this module simply have no
variant directory until regenerated. Public serializers expose variants
through additive read-only fields.
"""

import base64
import io
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings
from PIL import Image, ImageOps

# Decompression-bomb guard: Pillow's default `MAX_IMAGE_PIXELS` (~89MP decompression
# warning / ~178MP hard error) stays ACTIVE here as defense-in-depth. Every
# generated-from upload has already passed `ImageValidator` (max 4000x3000 ≈ 12MP),
# so this can never trip on a legitimate file — but a file that somehow reached
# this module unvalidated (e.g. a future caller skips validation) is rejected
# outright instead of exhausting memory.


# --- Central variant rules (the single home of sizes/quality) ---------------

WEBP_QUALITY = 82
LQIP_QUALITY = 40
LQIP_WIDTH = 10

# (name, bounding box). `Image.thumbnail` preserves aspect ratio and fits
# inside the box without cropping or upscaling, so the plan's
# 400x300/800x600/1600x1200 sizes are upper bounds: a 4:3 landscape fills a
# box exactly; a 2:3 portrait yields 225x300 in the small box.
VARIANT_SPECS = (
    ("sm", (400, 300)),
    ("md", (800, 600)),
    ("lg", (1600, 1200)),
)


@dataclass(frozen=True)
class VariantSet:
    """URLs (MEDIA_URL-relative, POSIX) plus the on-disk LQIP file location."""

    webp: str
    sm: str
    md: str
    lg: str
    lqip: str
    # Absolute filesystem paths of every file this set comprises. The creator
    # tracks them because `transaction.atomic()` never rolls back the
    # filesystem — the same contract as Phase 3's `GalleryWrite`.
    _paths: tuple

    def as_dict(self):
        """The API shape public serializers expose (no private fields)."""
        return {
            "webp": self.webp,
            "sm": self.sm,
            "md": self.md,
            "lg": self.lg,
            "lqip": self.lqip,
        }


# --- Path derivation --------------------------------------------------------


def _media_url_to_path(url):
    """MEDIA_URL-relative URL → absolute filesystem path, or None if not ours.

    Accepts absolute media URLs as serialized by ImageField as well as the
    bare relative paths stored in Phase 3's gallery JSONField entries.
    """
    if not isinstance(url, str) or not url:
        return None
    prefix = settings.MEDIA_URL
    if url.startswith(prefix):
        relative = url[len(prefix):]
    else:
        relative = url
    if relative.startswith("/") or ".." in relative.replace("\\", "/").split("/"):
        return None
    return os.path.join(settings.MEDIA_ROOT, *relative.split("/"))


def _path_to_media_url(path):
    """Absolute filesystem path under MEDIA_ROOT → MEDIA_URL-relative URL."""
    relative = os.path.relpath(path, settings.MEDIA_ROOT).replace(os.sep, "/")
    return f"{settings.MEDIA_URL}{relative}"


def variant_dir_for(source_path):
    """The deterministic variant directory for an original file's path."""
    stem = Path(source_path).stem
    return os.path.join(os.path.dirname(source_path), ".variants", stem)


def source_has_variants(source_path):
    """True when the source's complete variant set exists on disk."""
    directory = variant_dir_for(source_path)
    expected = ["lqip.webp"] + [f"{name}.webp" for name, _ in VARIANT_SPECS]
    return all(os.path.isfile(os.path.join(directory, name)) for name in expected)


def is_variant_artifact(path):
    """True when a path is inside any `.variants` directory (Phase 5 cleanup)."""
    parts = Path(path).parts
    return ".variants" in parts


# --- Generation -------------------------------------------------------------


def generate_variants(source_path):
    """Generate the complete variant set for one original file.

    All-or-nothing: encodes everything in memory, then writes each file to a
    dot-tmp name in the target directory and `os.replace`s it into its final
    name (atomic on the same filesystem). On any failure, files created by
    this call are removed and the exception re-raised — the original and any
    pre-existing complete set are never touched.

    Returns the created `VariantSet`.
    """
    source_path = os.path.abspath(source_path)
    if not os.path.isfile(source_path):
        raise FileNotFoundError(source_path)

    target_dir = variant_dir_for(source_path)

    # 1. Encode everything in memory first (Pillow failures happen here,
    #    before any disk state — not even the directory — exists).
    with Image.open(source_path) as img:
        # `Image.open` is lazy; force a full load while the source handle is
        # open, and bake EXIF orientation into the pixels so thumbnails of
        # phone photos are not rotated.
        img.load()
        img = ImageOps.exif_transpose(img)
        # Mode normalization for the WebP encode. Alpha must SURVIVE: the
        # catalog uses transparent cutouts (remove-bg PNGs), and an RGBA→RGB
        # flatten composites them onto black with dark, jagged fringes at the
        # cut edges. CMYK (print-color JPEG) has no alpha to keep; every other
        # non-RGB mode (P, LA, I;16, ...) converts to RGBA so transparency is
        # carried through — WebP stores it natively and fully-opaque alpha
        # costs nothing visually.
        if img.mode == "CMYK":
            img = img.convert("RGB")
        elif img.mode not in ("RGB", "L", "RGBA"):
            img = img.convert("RGBA")

        outputs = {}
        full = io.BytesIO()
        img.save(full, "WEBP", quality=WEBP_QUALITY)
        outputs["webp.webp"] = full.getvalue()

        for name, box in VARIANT_SPECS:
            thumb_io = io.BytesIO()
            thumbnail = img.copy()
            thumbnail.thumbnail(box, Image.LANCZOS)
            thumbnail.save(thumb_io, "WEBP", quality=WEBP_QUALITY)
            outputs[f"{name}.webp"] = thumb_io.getvalue()

        lqip_io = io.BytesIO()
        lqip = img.copy()
        lqip.thumbnail((LQIP_WIDTH, LQIP_WIDTH * 100), Image.LANCZOS)
        lqip.save(lqip_io, "WEBP", quality=LQIP_QUALITY)
        outputs["lqip.webp"] = lqip_io.getvalue()

    # 2. Write-then-rename into place, tracking exactly what we created.
    os.makedirs(target_dir, exist_ok=True)
    created = []
    try:
        final_paths = {}
        for filename, payload in outputs.items():
            final = os.path.join(target_dir, filename)
            fd, tmp_path = tempfile.mkstemp(
                prefix=f".{os.path.splitext(filename)[0]}-", suffix=".tmp", dir=target_dir
            )
            try:
                with os.fdopen(fd, "wb") as handle:
                    handle.write(payload)
                # `mkstemp` creates the file 0600 by design (immune to umask);
                # `os.replace` preserves that mode. These files are publicly
                # served by nginx, whose unprivileged worker cannot read a
                # root-owned 0600 file — normalize to the same 0644 Django
                # FileField uploads get before the atomic rename.
                os.chmod(tmp_path, 0o644)
                os.replace(tmp_path, final)
            except BaseException:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
                raise
            created.append(final)
            final_paths[os.path.splitext(filename)[0]] = final

        return VariantSet(
            webp=_path_to_media_url(final_paths["webp"]),
            sm=_path_to_media_url(final_paths["sm"]),
            md=_path_to_media_url(final_paths["md"]),
            lg=_path_to_media_url(final_paths["lg"]),
            lqip=_path_to_media_url(final_paths["lqip"]),
            _paths=tuple(created),
        )
    except BaseException:
        for path in created:
            try:
                os.remove(path)
            except OSError:
                pass
        raise


def variants_payload_for_url(url):
    """The additive API dict for one stored media URL, or None.

    Read-only, disk-truth only: it never generates (generation belongs to the
    save pipeline and the regen command). Missing, external or hostile URLs
    degrade to None, which the public serializers omit — pre-regeneration
    responses are byte-identical to the pre-4A API.
    """
    if not isinstance(url, str) or not url:
        return None
    path = _media_url_to_path(url)
    if not path or not source_has_variants(path):
        return None

    rel_dir = os.path.relpath(variant_dir_for(path), settings.MEDIA_ROOT).replace(os.sep, "/")
    urls = {
        name: f"{settings.MEDIA_URL}{rel_dir}/{name}.webp"
        for name in ("sm", "md", "lg", "webp", "lqip")
    }
    return {**urls, "blur": lqip_data_url(VariantSet(_paths=(), **urls))}


def lqip_data_url(variant_set):
    """The LQIP file as a base64 data URL for next/image's `blurDataURL`.

    Reads the tiny (≤ a few hundred bytes) LQIP file; returns None when the
    file is missing so callers degrade to no placeholder rather than crash.
    """
    path = _media_url_to_path(variant_set.lqip)
    if not path or not os.path.isfile(path):
        return None
    with open(path, "rb") as handle:
        payload = handle.read()
    return f"data:image/webp;base64,{base64.b64encode(payload).decode('ascii')}"


__all__ = [
    "VariantSet",
    "VARIANT_SPECS",
    "WEBP_QUALITY",
    "LQIP_WIDTH",
    "variant_dir_for",
    "source_has_variants",
    "is_variant_artifact",
    "generate_variants",
    "variants_payload_for_url",
    "lqip_data_url",
]
