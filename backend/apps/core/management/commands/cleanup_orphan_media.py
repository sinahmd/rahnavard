"""Orphan media cleanup (Phase 5).

Plan: `IMPLEMENTATION_PLAN.md` §4 (Orphan cleanup), §8 Phase 5; the accepted
Case-E residual risk of Phase 3 (§7.2) and Phase 4A (ADR-0009) is cleaned here.

What counts as an orphan
------------------------
A file under `MEDIA_ROOT` that no database row references:

- **Plain media orphans** — files whose relative path no media field or
  gallery entry references. The canonical case is an `ImageField`/`FileField`
  replacement or a failed upload where the DB rolled back but the file write
  survived (FileField semantics — see `apps/cars/test_gallery_storage.py`).
- **Variant artifacts of dead originals** — a `.variants/<stem>/` directory
  (Phase 4A, ADR-0009) belongs to the original file sitting next to it. When
  the original is missing from disk or is itself an orphan, the whole variant
  directory goes with it. A dot-tmp leftover *inside the variant directory of
  a live original* (the Phase 4A crash-mid-write artifact) is an orphan too.
- **Gallery staging leftovers** — `.gallery-upload-*` directories created by
  `GalleryField.save_gallery_files` under `MEDIA_ROOT` (Phase 3 §7.2 Case E:
  a process crash between `mkdtemp` and cleanup). Never referenced by design.

What is never touched
---------------------

- Files referenced by any row — including **soft-deleted** rows (`with_deleted()`),
  whose files must stay restorable, and the singleton `SiteSettings`.
- Variant sets of referenced originals (minus their dot-tmp leftovers).
- Unknown dot-prefixed files outside the two recognized dot-directories —
  the command only understands its own conventions and leaves everything
  else (e.g. `.gitkeep`) alone.
- Directories are only ever *pruned when empty* (`os.rmdir`); nothing is
  removed recursively except through its individual orphan files.

Behavior
--------

- **Dry-run by default**: lists orphans, deletes nothing.
- **`--delete`**: removes exactly the reported orphans, then prunes the
  directories it emptied.
- Idempotent: a second run reports nothing.
"""

import os
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.articles.models import Article
from apps.branches.models import Branch
from apps.cars.models import Car
from apps.core.image_variants import is_variant_artifact
from apps.core.models import HeroSlide, SiteSettings, WhyFeature

VARIANTS_DIRNAME = ".variants"
STAGING_PREFIX = ".gallery-upload-"


# --- Referenced-path collection ---------------------------------------------


def _field_relative(field_file):
    """A FieldFile's MEDIA_ROOT-relative path, or None when empty/unsafe."""
    if not field_file or not field_file.name:
        return None
    name = field_file.name.replace("\\", "/")
    if name.startswith("/") or ".." in name.split("/"):
        return None
    return name


def _url_relative(url):
    """A MEDIA_URL string's MEDIA_ROOT-relative path, or None when external/unsafe."""
    if not isinstance(url, str) or not url.startswith(settings.MEDIA_URL):
        return None
    relative = url[len(settings.MEDIA_URL) :].replace("\\", "/")
    if not relative or relative.startswith("/") or ".." in relative.split("/"):
        return None
    return relative


def _referenced_paths():
    """Every media-relative path any database row references (soft-deletes too)."""
    referenced = set()

    for car in Car.objects.with_deleted().iterator():
        for field_file in (car.main_image, car.og_image, car.catalog_file):
            relative = _field_relative(field_file)
            if relative:
                referenced.add(relative)
        for url in car.gallery or []:
            relative = _url_relative(url)
            if relative:
                referenced.add(relative)

    for article in Article.objects.with_deleted().iterator():
        for field_file in (article.cover_image, article.og_image):
            relative = _field_relative(field_file)
            if relative:
                referenced.add(relative)

    for branch in Branch.objects.with_deleted().iterator():
        relative = _field_relative(branch.map_image)
        if relative:
            referenced.add(relative)

    for slide in HeroSlide.objects.all().iterator():
        relative = _field_relative(slide.image)
        if relative:
            referenced.add(relative)

    for feature in WhyFeature.objects.all().iterator():
        relative = _field_relative(feature.icon)
        if relative:
            referenced.add(relative)

    site = SiteSettings.objects.filter(pk=1).first()
    if site is not None:
        for field_file in (site.logo, site.default_og_image):
            relative = _field_relative(field_file)
            if relative:
                referenced.add(relative)

    return referenced


# --- Filesystem classification ----------------------------------------------


def _original_relative(variant_file_relative):
    """`.variants/<stem>/<file>` → the original's relative path, or None.

    The original sits next to the `.variants` directory with the same stem and
    an unknown extension (Phase 4A: stems are unique per directory), so the
    first regular file with a matching stem wins.
    """
    parts = variant_file_relative.split("/")
    index = parts.index(VARIANTS_DIRNAME)
    if index == 0 or len(parts) < index + 2:
        return None
    stem = parts[index + 1]
    original_dir = os.path.join(settings.MEDIA_ROOT, *parts[:index])
    try:
        for entry in sorted(os.scandir(original_dir), key=lambda e: e.name):
            if entry.is_file() and Path(entry.name).stem == stem:
                return "/".join([*parts[:index], entry.name])
    except OSError:
        return None
    return None


def _is_variant_tmp(basename):
    """Phase 4A crash artifact: `tempfile.mkstemp(prefix='.<name>-', suffix='.tmp')`."""
    return basename.startswith(".") and basename.endswith(".tmp")


def _is_staging(parts):
    """Inside a Phase 3 `.gallery-upload-*` staging directory (top level only)."""
    return bool(parts) and parts[0].startswith(STAGING_PREFIX)


def _walk_media():
    """All regular files under MEDIA_ROOT as MEDIA_ROOT-relative POSIX paths."""
    media_root = settings.MEDIA_ROOT
    found = []
    for root, _dirs, files in os.walk(media_root):
        for filename in files:
            relative = os.path.relpath(os.path.join(root, filename), media_root)
            found.append(relative.replace(os.sep, "/"))
    return found


def _orphans(present, referenced):
    """Split the on-disk set into orphans and deliberately-skipped paths."""
    orphans = set()
    for relative in present:
        parts = relative.split("/")
        if is_variant_artifact(relative):
            original = _original_relative(relative)
            if original is not None and original in referenced and original in present:
                # Live original: its real variants are referenced implicitly;
                # only the crash-artifact temp files are orphans.
                if _is_variant_tmp(parts[-1]):
                    orphans.add(relative)
                continue
            orphans.add(relative)  # dead original, missing original, or temp
        elif _is_staging(parts):
            orphans.add(relative)
        elif relative in referenced:
            continue
        elif relative.split("/")[0].startswith("."):
            continue  # unknown dotfile — not ours, leave it alone
        else:
            orphans.add(relative)
    return orphans


# --- Deletion ---------------------------------------------------------------


def _prune_empty_dirs(deleted_paths):
    """Remove directories emptied by the deletion (rmdir only — never recursive)."""
    pruned = 0
    candidate_dirs = {os.path.dirname(os.path.join(settings.MEDIA_ROOT, *p.split("/"))) for p in deleted_paths}
    for directory in sorted(candidate_dirs, key=len, reverse=True):
        current = directory
        while os.path.normpath(current) != os.path.normpath(settings.MEDIA_ROOT):
            try:
                os.rmdir(current)  # fails (OSError) when not empty
            except OSError:
                break
            pruned += 1
            current = os.path.dirname(current)
    return pruned


class Command(BaseCommand):
    help = (
        "Preview (default) or delete (--delete) media files under MEDIA_ROOT "
        "that no database row references — including Phase 3 staging leftovers "
        "and Phase 4A variant artifacts of dead originals."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Delete the orphan files. Without this flag: preview only.",
        )

    def handle(self, *args, **options):
        delete = options["delete"]

        referenced = _referenced_paths()
        present = _walk_media()
        orphans = _orphans(set(present), referenced)

        if not orphans:
            self.stdout.write(self.style.SUCCESS("No orphan media files."))
            return

        for relative in sorted(orphans):
            self.stdout.write(f"{'DELETE' if delete else 'ORPHAN'}  {relative}")

        if not delete:
            self.stdout.write(
                self.style.WARNING(
                    f"{len(orphans)} orphan file(s) found (dry run). "
                    "Run with --delete to remove them."
                )
            )
            return

        removed = 0
        for relative in sorted(orphans):
            path = os.path.join(settings.MEDIA_ROOT, *relative.split("/"))
            try:
                os.remove(path)
            except OSError:
                self.stderr.write(self.style.WARNING(f"FAILED  {relative}"))
                continue
            removed += 1

        pruned = _prune_empty_dirs(orphans)
        remaining = len(_walk_media())
        if remaining != len(present) - removed:
            # Defensive: nothing else may disappear in a cleanup pass.
            self.stderr.write(
                self.style.ERROR("File count changed unexpectedly — verify MEDIA_ROOT.")
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {removed} orphan file(s), pruned {pruned} empty dir(s)."
            )
        )
