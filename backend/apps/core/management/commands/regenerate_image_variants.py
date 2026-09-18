"""Regenerate image variants for all content images (Phase 4A).

The runtime pipeline (``apps.core.variant_pipeline``) generates variants
when an image is uploaded; this command backfills every pre-existing image
after a deploy and repairs any gap left by a contained generation failure.

Behavior
--------
- **Dry-run by default**: reports counts per source, never writes.
- **Idempotent / gap-filling**: images that already have a complete variant
  set are skipped (a set is never rebuilt over itself), so the command can
  be run repeatedly and against partially generated data — exactly the
  partially-generated state a crash mid-regen leaves behind. Pass
  ``--force`` to rebuild existing sets in place (originals are never
  touched; rebuilt files replace the old ones via atomic rename).
- **Failure-tolerant**: an image whose bytes Pillow cannot decode is
  reported as ``UNREADABLE`` and skipped; the command exits nonzero only if
  ``--strict`` is passed. A corrupt legacy image must not block backfilling
  the rest of the library.

Usage::

    python manage.py regenerate_image_variants                  # preview
    python manage.py regenerate_image_variants --apply          # backfill gaps
    python manage.py regenerate_image_variants --apply --force  # rebuild all
"""

import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.articles.models import Article
from apps.cars.models import Car
from apps.core.image_variants import (
    generate_variants,
    source_has_variants,
)
from apps.core.models import HeroSlide

# (label, queryset-provider, image attribute) — providers are callables so
# the import-time querysets stay lazy (management commands may run before
# apps are fully loaded in exotic setups; cheap insurance, no complexity).
SOURCES = [
    ("car.main_image", lambda: Car.objects.with_deleted(), "main_image"),
    ("article.cover_image", lambda: Article.objects.with_deleted(), "cover_image"),
    ("hero.image", lambda: HeroSlide.objects.all(), "image"),
    # Gallery files bypass ImageField and signals; their URLs live in the
    # JSONField and must be walked separately.
    ("car.gallery", lambda: Car.objects.with_deleted(), "gallery"),
]


def _gallery_source_urls(instance):
    """Absolute filesystem paths for a car's local-media gallery entries."""
    from django.conf import settings

    for url in instance.gallery or []:
        if isinstance(url, str) and url.startswith(settings.MEDIA_URL):
            relative = url[len(settings.MEDIA_URL):]
            if relative and not relative.startswith("/"):
                yield os.path.join(settings.MEDIA_ROOT, *relative.split("/"))


class Command(BaseCommand):
    help = (
        "Preview (default) or generate upload-time image variants "
        "(WebP, thumbnails, LQIP) for all content images."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Generate missing variant sets. Without this flag: preview only.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Also rebuild variant sets that already exist (default: skip).",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit nonzero if any image could not be processed.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        force = options["force"]
        strict = options["strict"]

        totals = {"ok": 0, "skip": 0, "unreadable": 0, "missing": 0}
        for label, queryset_provider, field_name in SOURCES:
            for instance in queryset_provider():
                if field_name == "gallery":
                    source_paths = list(_gallery_source_urls(instance))
                else:
                    field_file = getattr(instance, field_name)
                    if not field_file or not field_file.name:
                        totals["missing"] += 1
                        continue
                    source_paths = [
                        os.path.join(
                            settings.MEDIA_ROOT, *field_file.name.split("/")
                        )
                    ]

                for source_path in source_paths:
                    if not os.path.isfile(source_path):
                        totals["missing"] += 1
                        continue
                    if source_has_variants(source_path) and not force:
                        totals["skip"] += 1
                        continue
                    if not apply_changes:
                        totals["ok"] += 1
                        continue

                    try:
                        generate_variants(source_path)
                    except Exception:
                        totals["unreadable"] += 1
                        self.stderr.write(
                            self.style.WARNING(
                                f"UNREADABLE  {label} pk={instance.pk} "
                                f"{os.path.basename(source_path)}"
                            )
                        )
                    else:
                        totals["ok"] += 1

        if not apply_changes:
            self.stdout.write(
                f"DRY RUN — {totals['ok']} image(s) would get variants, "
                f"{totals['skip']} already complete (skipped), "
                f"{totals['missing']} without a local file. "
                f"Run with --apply to generate."
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Generated: {totals['ok']} | already complete: {totals['skip']} | "
                    f"unreadable: {totals['unreadable']} | missing file: {totals['missing']}"
                )
            )

        if strict and totals["unreadable"]:
            raise CommandError(
                f"{totals['unreadable']} image(s) could not be processed."
            )
