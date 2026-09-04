"""
Preview and apply HTML sanitization backfill for rich-text content fields.

The same allowlist sanitizer runs automatically on model ``save()`` and in
the data migrations ``0008_sanitize_car_technical_description`` /
``0005_sanitize_article_content``. This command is the safe, explicit way
to inspect the impact *before* those migrations run on production and to
pre-apply the backfill during a maintenance window.

Usage
-----
Preview only (default, never writes)::

    python manage.py backfill_sanitize                 # cars + articles
    python manage.py backfill_sanitize --model car     # one model

Apply (idempotent; safe to re-run)::

    python manage.py backfill_sanitize --apply
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.articles.models import Article
from apps.cars.models import Car
from apps.core.sanitizer import (
    preview_sanitize_field_rows,
    sanitize_field_rows,
)

# Note: ``with_deleted()`` so soft-deleted rows are cleaned too — they can
# be restored later and must not resurface unsanitized content.
TARGETS = {
    "car": (Car.objects.with_deleted(), "technical_description"),
    "article": (Article.objects.with_deleted(), "content"),
}


class Command(BaseCommand):
    help = (
        "Preview (default) or apply HTML sanitization of rich-text content "
        "fields (Car.technical_description, Article.content)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--model",
            choices=["car", "article", "all"],
            default="all",
            help="Which model(s) to process (default: all).",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help=(
                "Persist sanitized content. Without this flag the command "
                "only previews row counts and never writes to the database."
            ),
        )

    def handle(self, *args, **options):
        model_keys = (
            ["car", "article"] if options["model"] == "all" else [options["model"]]
        )

        with transaction.atomic():
            for key in model_keys:
                manager, field = TARGETS[key]
                total, would_change, _ = preview_sanitize_field_rows(manager, field)

                if not options["apply"]:
                    self.stdout.write(
                        f"[{key}] {total} row(s) total | "
                        f"{would_change} would change "
                        f"(run with --apply to persist)"
                    )
                    continue

                changed = sanitize_field_rows(manager, field)
                self.stdout.write(
                    self.style.SUCCESS(f"[{key}] {changed} of {total} row(s) updated")
                )
