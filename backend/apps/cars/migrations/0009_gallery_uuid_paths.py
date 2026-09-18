"""Move car gallery files from slug-based names to immutable UUID paths.

Plan: `IMPLEMENTATION_PLAN.md` §7.1 and §11; rationale and rejected
alternatives: `docs/adr/0007-uuid-gallery-storage.md`.

Legacy scheme (written by the pre-Phase-3 serializer):
    /media/cars/gallery/{slug}_gallery_{idx}{ext}

New scheme:
    /media/cars/{car_id}/gallery/{uuid}{ext}

Filesystem migrations are NOT database transactions: this migration renames
each existing file on disk and rewrites the matching JSONField URL, so the
database and the media volume stay in step. It is idempotent — URLs outside the
legacy directory are left untouched, so re-running it changes nothing.

Reversal is deliberately a no-op (`RunPython.noop`): the reverse rename could
only guess at the original slug-based name, and a half-renamed media volume is
worse than a database at the previous migration state. Roll back a bad deploy by
restoring a backup instead (`scripts/restore.sh`).
"""

import os
import uuid

from django.conf import settings
from django.db import migrations

# Legacy location, relative to MEDIA_URL.
LEGACY_DIR = "cars/gallery/"


def migrate_gallery_file(car_id, url):
    """Rename one legacy gallery file; return the URL that should be stored.

    Never invents a path and never drops an entry: a URL that is not ours to
    move, or whose file is already missing, is returned unchanged.
    """
    if not isinstance(url, str) or not url.startswith(settings.MEDIA_URL):
        return url  # absolute/external URL — not ours to move
    relative = url[len(settings.MEDIA_URL):]
    if not relative.startswith(LEGACY_DIR):
        return url  # already migrated, or unrelated to the gallery directory
    filename = relative[len(LEGACY_DIR):]
    if not filename or "/" in filename or "\\" in filename:
        return url

    source = os.path.join(settings.MEDIA_ROOT, "cars", "gallery", filename)
    if not os.path.isfile(source):
        return url

    target_dir = os.path.join(settings.MEDIA_ROOT, "cars", str(car_id), "gallery")
    os.makedirs(target_dir, exist_ok=True)
    target_filename = f"{uuid.uuid4().hex}{os.path.splitext(filename)[1].lower()}"
    os.replace(source, os.path.join(target_dir, target_filename))
    return f"{settings.MEDIA_URL}cars/{car_id}/gallery/{target_filename}"


def migrate_gallery_paths(apps, schema_editor):
    Car = apps.get_model("cars", "Car")
    # Historical models get a plain manager (SoftDeleteManager has
    # use_in_migrations=False), so soft-deleted cars are included — their files
    # must move too, or restoring one would leave broken URLs behind.
    for car in Car.objects.all():
        gallery = list(car.gallery or [])
        if not gallery:
            continue
        urls = [migrate_gallery_file(car.pk, url) for url in gallery]
        if urls != gallery:
            car.gallery = urls
            car.save(update_fields=["gallery"])


class Migration(migrations.Migration):

    dependencies = [
        ("cars", "0008_sanitize_car_technical_description"),
    ]

    operations = [
        migrations.RunPython(migrate_gallery_paths, migrations.RunPython.noop),
    ]
