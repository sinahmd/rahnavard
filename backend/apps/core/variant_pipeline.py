"""Filesystem post-save hook for image variants (Phase 4A).

One `post_save` receiver per model carrying a generated content image. The
variant work runs strictly AFTER the database commit: `post_save` fires
inside `transaction.atomic()` blocks (DRF admin serializers run inside one),
so `transaction.on_commit()` defers generation until the row is durably
stored. That is the only ordering in which "DB write failed ⇒ no variants"
holds without the filesystem pretending the database can roll it back —
the same invariant as Phase 3 (IMPLEMENTATION_PLAN §7.2).

Generation failures are contained and logged, never propagated into the
request: an image upload that succeeds in the database must not 500 merely
because Pillow or the disk hiccuped afterwards. The failure mode is a row
whose original renders as it always has, without variants — exactly the
pre-4A state — and `regenerate_image_variants` (gap-filling, idempotent)
repairs it. Phase 3's gallery write is the stricter case: there the file
path is part of the stored data, so failure must abort the request; here
variants are derived extras, so containment is the correct policy.

Gallery uploads bypass signals entirely — `GalleryField.save_gallery_files`
writes files straight to their final paths — so it calls `generate_for_urls`
for exactly the URLs it created, still deferred to `on_commit` inside its
calling transaction. The regen command's `car.gallery` source backfills
anything older or failed.
"""

import logging
import os

from django.db import transaction
from django.db.models.signals import post_save

from .image_variants import generate_variants, source_has_variants

logger = logging.getLogger(__name__)


def _generate_for_relative_name(relative_name):
    """Worker: MEDIA_ROOT-relative name → VariantSet, None when no work to do.

    Raises on generation failure — callers decide the containment policy.
    """
    from django.conf import settings

    source_path = os.path.join(settings.MEDIA_ROOT, *relative_name.split("/"))
    if not os.path.isfile(source_path) or source_has_variants(source_path):
        return None
    return generate_variants(source_path)


def generate_for_field(instance, field_name):
    """Generate variants for one ImageField of a saved instance.

    Returns the VariantSet, or None when the field is empty, points outside
    local media, or already has its complete set (the common save() path —
    variant files are content-addressed by the source path, so a re-save
    without a new upload is a no-op).
    """
    field_file = getattr(instance, field_name, None)
    if not field_file or not field_file.name:
        return None
    # `name` is the MEDIA_ROOT-relative storage path for both committed and
    # freshly uploaded files.
    return _generate_for_relative_name(field_file.name)


def generate_for_urls(urls):
    """Generate variants for the local-media URLs a gallery upload just created.

    Containment is per entry: one unreadable or undecodable file must not
    stop its batch siblings from getting variants, and must never propagate
    into the request (same policy as the signal path above).
    """
    from django.conf import settings

    prefix = settings.MEDIA_URL
    for url in urls:
        if not isinstance(url, str) or not url.startswith(prefix):
            continue
        relative = url[len(prefix):]
        if not relative or relative.startswith("/"):
            continue
        try:
            _generate_for_relative_name(relative)
        except Exception:
            logger.exception("variant generation failed for gallery entry %s", url)


def register_receiver(model, *field_names):
    """Attach a post_save receiver generating variants for the given fields."""

    def on_post_save(sender, instance, created, **kwargs):
        def _generate():
            for field_name in field_names:
                try:
                    generate_for_field(instance, field_name)
                except Exception:
                    # Contained by design (see module docstring): the row is
                    # committed and the original still renders; variants are
                    # a derived extra. The regen command repairs the gap.
                    logger.exception(
                        "variant generation failed for %s.%s pk=%s",
                        sender.__name__,
                        field_name,
                        instance.pk,
                    )

        transaction.on_commit(_generate)

    post_save.connect(
        on_post_save,
        sender=model,
        dispatch_uid=f"core.variant_pipeline.{model.__name__}",
    )
