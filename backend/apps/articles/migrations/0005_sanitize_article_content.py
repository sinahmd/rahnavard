"""
Data migration: backfill-sanitize ``Article.content``.

Sanitizes every existing row (including soft-deleted ones) with the same
allowlist sanitizer that runs on ``Article.save()``. The operation is
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


def sanitize_article_content(apps, schema_editor):
    Article = apps.get_model("articles", "Article")
    changed = sanitize_field_rows(Article.objects, "content")
    print(f"sanitize article.content: {changed} row(s) updated")


class Migration(migrations.Migration):
    dependencies = [
        ("articles", "0004_alter_article_slug_and_more"),
    ]

    operations = [
        migrations.RunPython(
            sanitize_article_content,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
