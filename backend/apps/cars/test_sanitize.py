import pytest

from apps.core.sanitizer import (
    preview_sanitize_field_rows,
    sanitize_field_rows,
)
from .models import Car

DANGEROUS_HTML = (
    '<p>متن امن</p>'
    '<script>alert(1)</script>'
    '<img src="x.jpg" onerror="alert(1)">'
    '<a href="javascript:alert(1)">bad</a>'
)


@pytest.mark.django_db
class TestCarTechnicalDescriptionSanitization:
    """Car.technical_description is sanitized on every save."""

    def test_dangerous_html_is_sanitized_on_create(self, sample_car):
        sample_car.technical_description = DANGEROUS_HTML
        sample_car.save()
        sample_car.refresh_from_db()

        cleaned = sample_car.technical_description
        assert '<script' not in cleaned
        assert 'onerror' not in cleaned
        assert 'javascript:' not in cleaned
        assert 'متن امن' in cleaned

    def test_dangerous_html_is_sanitized_on_update(self, sample_car):
        # Initial safe value stays untouched by unrelated saves
        sample_car.save()
        sample_car.technical_description = '<p>سالم</p>'
        sample_car.save()
        sample_car.refresh_from_db()
        assert sample_car.technical_description == '<p>سالم</p>'

        # Dirty value is cleaned on the write
        sample_car.technical_description = DANGEROUS_HTML
        sample_car.save()
        sample_car.refresh_from_db()
        assert '<script' not in sample_car.technical_description

    def test_legitimate_html_is_preserved(self, sample_car):
        # Canonical markup (explicit tbody): sanitizer must round-trip it
        # byte-for-byte.
        safe = (
            '<h2>مشخصات</h2>'
            '<table><tbody><tr><th colspan="2">موتور</th></tr>'
            '<tr><td>حجم</td><td>۲.۵ لیتر</td></tr></tbody></table>'
            '<p>توضیح <strong>فنی</strong> و <a href="tel:+98911">تماس</a></p>'
            '<img src="/media/cars/gallery/1.jpg" alt="نمای خودرو">'
        )
        sample_car.technical_description = safe
        sample_car.save()
        sample_car.refresh_from_db()
        assert sample_car.technical_description == safe

    def test_sanitized_value_is_idempotent(self, sample_car):
        sample_car.technical_description = DANGEROUS_HTML
        sample_car.save()
        sample_car.refresh_from_db()
        first = sample_car.technical_description

        sample_car.save()  # second save must not change anything further
        sample_car.refresh_from_db()
        assert sample_car.technical_description == first


@pytest.mark.django_db
class TestCarBackfill:
    """Backfill helpers clean pre-existing rows (idempotently)."""

    def _inject_raw_html(self, car, html):
        # Bypass save() so we can simulate rows written before sanitization.
        Car.objects.filter(pk=car.pk).update(technical_description=html)
        car.refresh_from_db()
        assert '<script' in car.technical_description

    def test_preview_counts_rows_that_would_change(self, sample_car):
        self._inject_raw_html(sample_car, DANGEROUS_HTML)
        Car.objects.create(
            brand='Toyota', model='Corolla', persian_name='کورولا',
            slug='toyota-corolla', year=2024, fuel_type='gasoline',
            transmission='automatic', main_image='x.jpg',
            technical_description='<p>تمیز</p>',
        )
        total, would_change, clean = preview_sanitize_field_rows(
            Car.objects.with_deleted(), 'technical_description'
        )
        assert total == 2
        assert would_change == 1
        assert clean == 1
        # Preview must not write anything
        sample_car.refresh_from_db()
        assert '<script' in sample_car.technical_description

    def test_backfill_updates_only_dirty_rows_and_is_idempotent(
        self, sample_car
    ):
        self._inject_raw_html(sample_car, DANGEROUS_HTML)
        manager = Car.objects.with_deleted()

        changed = sanitize_field_rows(manager, 'technical_description')
        assert changed == 1

        sample_car.refresh_from_db()
        assert '<script' not in sample_car.technical_description

        # Second run is a no-op (idempotent)
        assert sanitize_field_rows(manager, 'technical_description') == 0

    def test_backfill_covers_soft_deleted_rows(self, sample_car):
        self._inject_raw_html(sample_car, DANGEROUS_HTML)
        sample_car.soft_delete()

        changed = sanitize_field_rows(
            Car.objects.with_deleted(), 'technical_description'
        )
        assert changed == 1

        row = Car.objects.with_deleted().get(pk=sample_car.pk)
        assert '<script' not in row.technical_description
        assert row.is_deleted is True
