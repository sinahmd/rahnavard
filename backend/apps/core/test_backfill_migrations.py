"""
Tests for the HTML-sanitization data migrations.

The migrations run automatically whenever the schema is applied, so the
normal test suite only ever sees them execute against an *empty* database.
These tests use Django's MigrationExecutor to un-apply each backfill
migration, seed genuinely dirty rows (raw HTML written before sanitization
existed), re-apply the migration, and assert the rows were cleaned —
exercising the historical-model code path the app-level tests don't.

Recipe follows Django's documented migration-testing pattern:
https://docs.djangoproject.com/en/4.2/ref/migration-operations/#writing-migration-tests
"""

import re

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

DIRTY_CAR_HTML = '<p>متن</p><script>alert(1)</script><img src="x" onerror="alert(1)">'
DIRTY_ARTICLE_HTML = '<p>متن</p><iframe src="https://evil.example"></iframe>'


@pytest.fixture
def executor():
    return MigrationExecutor(connection)


def _migrate_to(executor, targets):
    """Migrate to ``targets`` and return the historical apps at that state."""
    executor.loader.build_graph()
    executor.migrate(targets)
    return executor.loader.project_state(targets).apps


class TestCarSanitizeMigration:
    """cars/0008_sanitize_car_technical_description."""

    BEFORE = [("cars", "0007_add_car_active_deleted_index")]
    AFTER = [("cars", "0008_sanitize_car_technical_description")]

    @pytest.mark.django_db(transaction=True)
    def test_backfills_dirty_rows_including_soft_deleted(self, executor):
        # 1. Step back to just before the data migration.
        old_apps = _migrate_to(executor, self.BEFORE)
        HistoricalCar = old_apps.get_model("cars", "Car")

        # 2. Seed dirty rows as they existed before sanitization existed
        #    (one active, one soft-deleted) by bypassing model save().
        car = HistoricalCar.objects.create(
            brand="Toyota",
            model="RAV4",
            persian_name="راو۴",
            slug="toyota-rav4-dirty",
            year=2024,
            fuel_type="gasoline",
            transmission="automatic",
            main_image="seed.jpg",
            technical_description=DIRTY_CAR_HTML,
        )
        deleted_car = HistoricalCar.objects.create(
            brand="Honda",
            model="Civic",
            persian_name="سیویک",
            slug="honda-civic-dirty",
            year=2024,
            fuel_type="gasoline",
            transmission="automatic",
            main_image="seed.jpg",
            technical_description=DIRTY_CAR_HTML,
            is_deleted=True,
        )

        # 3. Apply the data migration.
        _migrate_to(executor, self.AFTER)

        # 4. Rows are cleaned via the historical-model code path.
        from apps.cars.models import Car

        cleaned = Car.objects.with_deleted().get(pk=car.pk)
        assert "<script" not in cleaned.technical_description
        assert "onerror" not in cleaned.technical_description
        assert "متن" in cleaned.technical_description

        cleaned_deleted = Car.objects.with_deleted().get(pk=deleted_car.pk)
        assert "<script" not in cleaned_deleted.technical_description
        assert cleaned_deleted.is_deleted is True

    @pytest.mark.django_db(transaction=True)
    def test_is_idempotent_when_rerun(self, executor):
        old_apps = _migrate_to(executor, self.BEFORE)
        HistoricalCar = old_apps.get_model("cars", "Car")
        HistoricalCar.objects.create(
            brand="Toyota",
            model="Corolla",
            persian_name="کرولا",
            slug="toyota-corolla-dirty",
            year=2024,
            fuel_type="gasoline",
            transmission="automatic",
            main_image="seed.jpg",
            technical_description=DIRTY_CAR_HTML,
        )

        _migrate_to(executor, self.AFTER)
        from apps.cars.models import Car

        stored = Car.objects.get().technical_description

        # Un-apply and re-apply: nothing should change on the second run.
        old_apps = _migrate_to(executor, self.BEFORE)
        _migrate_to(executor, self.AFTER)
        assert Car.objects.get().technical_description == stored


class TestArticleSanitizeMigration:
    """articles/0005_sanitize_article_content."""

    BEFORE = [("articles", "0004_alter_article_slug_and_more")]
    AFTER = [("articles", "0005_sanitize_article_content")]

    @pytest.mark.django_db(transaction=True)
    def test_backfills_dirty_rows(self, executor):
        old_apps = _migrate_to(executor, self.BEFORE)
        HistoricalArticle = old_apps.get_model("articles", "Article")
        article = HistoricalArticle.objects.create(
            title="مقاله قدیمی",
            slug="old-article-dirty",
            content=DIRTY_ARTICLE_HTML,
        )

        _migrate_to(executor, self.AFTER)

        from apps.articles.models import Article

        cleaned = Article.objects.with_deleted().get(pk=article.pk)
        assert "iframe" not in cleaned.content
        assert "متن" in cleaned.content


class TestGalleryUuidMigration:
    """cars/0009_gallery_uuid_paths — the filesystem half of Phase 3.

    Filesystem migrations are not database transactions (plan §11), so this one
    renames real files on disk and rewrites the matching JSONField URLs. These
    tests pin the properties the plan requires: legacy files move to
    ``cars/{pk}/gallery/{uuid}{ext}``, nothing else on disk or in the field is
    touched, and re-running the migration changes nothing.

    ``MEDIA_ROOT`` is redirected to pytest's ``tmp_path``, so the test never
    writes into the real media directory.
    """

    BEFORE = [("cars", "0008_sanitize_car_technical_description")]
    AFTER = [("cars", "0009_gallery_uuid_paths")]

    @staticmethod
    def _seed_car(HistoricalCar, slug, gallery, **overrides):
        return HistoricalCar.objects.create(
            brand="Toyota",
            model="RAV4",
            persian_name="راو۴",
            slug=slug,
            year=2024,
            fuel_type="gasoline",
            transmission="automatic",
            main_image="seed.jpg",
            gallery=gallery,
            **overrides,
        )

    @pytest.mark.django_db(transaction=True)
    def test_migrates_legacy_files_and_is_idempotent(self, executor, tmp_path, settings):
        media_url = settings.MEDIA_URL
        media_root = tmp_path / "media"
        legacy_dir = media_root / "cars" / "gallery"
        legacy_dir.mkdir(parents=True)
        (legacy_dir / "legacy-car_gallery_0.png").write_bytes(b"legacy-0")
        (legacy_dir / "legacy-car_gallery_1.png").write_bytes(b"legacy-1")
        (legacy_dir / "legacy-deleted_gallery_0.png").write_bytes(b"legacy-deleted")
        settings.MEDIA_ROOT = str(media_root)

        old_apps = _migrate_to(executor, self.BEFORE)
        HistoricalCar = old_apps.get_model("cars", "Car")
        car = self._seed_car(
            HistoricalCar,
            "legacy-car",
            [
                f"{media_url}cars/gallery/legacy-car_gallery_0.png",
                f"{media_url}cars/gallery/legacy-car_gallery_1.png",
                f"{media_url}cars/hero.png",  # inside MEDIA_ROOT, not ours
                "https://cdn.example.com/remote.png",  # not a media URL
                f"{media_url}cars/gallery/vanished.png",  # file already missing
            ],
        )
        deleted_car = self._seed_car(
            HistoricalCar,
            "legacy-deleted",
            [f"{media_url}cars/gallery/legacy-deleted_gallery_0.png"],
            is_deleted=True,
        )

        _migrate_to(executor, self.AFTER)

        from apps.cars.models import Car

        migrated = Car.objects.with_deleted().get(pk=car.pk)
        # The paths the migration owns are rewritten to identity-derived UUIDs,
        # and the bytes survive the rename untouched.
        for index, expected_bytes in enumerate((b"legacy-0", b"legacy-1")):
            url = migrated.gallery[index]
            assert re.fullmatch(
                rf"{re.escape(media_url)}cars/{car.pk}/gallery/[0-9a-f]{{32}}\.png",
                url,
            ), url
            assert (media_root / url[len(media_url):]).read_bytes() == expected_bytes
        # Everything else is byte-for-byte untouched — including the entry whose
        # file is missing, which must not be silently dropped or invented.
        assert migrated.gallery[2:] == [
            f"{media_url}cars/hero.png",
            "https://cdn.example.com/remote.png",
            f"{media_url}cars/gallery/vanished.png",
        ]
        assert not (legacy_dir / "legacy-car_gallery_0.png").exists()
        assert not (legacy_dir / "legacy-car_gallery_1.png").exists()
        # Soft-deleted cars keep their files in step too, or restoring one would
        # leave broken URLs behind.
        deleted = Car.objects.with_deleted().get(pk=deleted_car.pk)
        assert deleted.gallery[0].startswith(
            f"{media_url}cars/{deleted_car.pk}/gallery/"
        )
        assert not (legacy_dir / "legacy-deleted_gallery_0.png").exists()

        # Idempotent: un-applying is a no-op, and the second run sees no legacy
        # URL left to rewrite.
        stored = list(migrated.gallery)
        _migrate_to(executor, self.BEFORE)
        _migrate_to(executor, self.AFTER)
        assert list(Car.objects.with_deleted().get(pk=car.pk).gallery) == stored
