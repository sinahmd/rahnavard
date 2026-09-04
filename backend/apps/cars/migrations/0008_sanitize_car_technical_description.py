"""
Data migration: backfill-sanitize ``Car.technical_description``.

Sanitizes every existing row (including soft-deleted ones) with the same
allowlist sanitizer that runs on ``Car.save()``. The operation is
idempotent — only rows whose value actually changes are updated — so this
migration is safe to run after a partial failure or after the equivalent
management command (``python manage.py backfill_sanitize``) has already
run; re-running finds nothing to do.

Reverse is a no-op: recovering the original unsanitized HTML is not
possible after this point. Preview the impact before deploying with::

    python manage.py backfill_sanitize        # preview only (no --apply)

(preview is the default; nothing is written unless --apply is passed.)
"""

from django.db import migrations

from apps.core.sanitizer import sanitize_field_rows


def sanitize_technical_description(apps, schema_editor):
    Car = apps.get_model("cars", "Car")
    changed = sanitize_field_rows(Car.objects, "technical_description")
    print(f"sanitize car.technical_description: {changed} row(s) updated")


class Migration(migrations.Migration):
    dependencies = [
        ("cars", "0007_add_car_active_deleted_index"),
    ]

    operations = [
        migrations.RunPython(
            sanitize_technical_description,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
