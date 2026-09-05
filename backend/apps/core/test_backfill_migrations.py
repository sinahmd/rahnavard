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
