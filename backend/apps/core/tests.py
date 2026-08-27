import pytest
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cars.models import Car
from .mixins import SoftDeleteManager, SoftDeleteMixin
from .models import HeroSlide, Redirect, SiteSettings, WhyFeature


# ============================================================================
# SoftDeleteMixin Tests
# ============================================================================


@pytest.mark.django_db
class TestSoftDeleteMixin:
    """Tests for SoftDeleteMixin functionality."""

    def test_soft_delete_sets_flags(self, sample_car):
        """Test that soft_delete sets is_deleted and deleted_at."""
        assert sample_car.is_deleted is False
        assert sample_car.deleted_at is None

        sample_car.soft_delete()

        sample_car.refresh_from_db()
        assert sample_car.is_deleted is True
        assert sample_car.deleted_at is not None

    def test_soft_delete_hides_from_default_manager(self, sample_car):
        """Test that soft-deleted items are hidden from default manager."""
        assert Car.objects.filter(pk=sample_car.pk).exists()

        sample_car.soft_delete()

        # Should not appear in default queryset
        assert not Car.objects.filter(pk=sample_car.pk).exists()

    def test_soft_delete_visible_in_with_deleted(self, sample_car):
        """Test that soft-deleted items appear in with_deleted()."""
        sample_car.soft_delete()

        # Should appear in with_deleted queryset
        assert Car.objects.with_deleted().filter(pk=sample_car.pk).exists()

    def test_soft_delete_only_in_deleted_only(self, sample_car):
        """Test that soft-deleted items appear in deleted_only()."""
        sample_car.soft_delete()

        # Should appear in deleted_only queryset
        assert Car.objects.deleted_only().filter(pk=sample_car.pk).exists()

    def test_restore_removes_flags(self, sample_car):
        """Test that restore clears is_deleted and deleted_at."""
        sample_car.soft_delete()
        sample_car.restore()

        sample_car.refresh_from_db()
        assert sample_car.is_deleted is False
        assert sample_car.deleted_at is None

    def test_restore_makes_visible_again(self, sample_car):
        """Test that restore makes item visible in default manager."""
        sample_car.soft_delete()
        assert not Car.objects.filter(pk=sample_car.pk).exists()

        sample_car.restore()
        assert Car.objects.filter(pk=sample_car.pk).exists()

    def test_hard_delete_removes_permanently(self, sample_car):
        """Test that hard_delete permanently removes the record."""
        pk = sample_car.pk
        sample_car.hard_delete()

        # Should not appear in any queryset
        assert not Car.objects.filter(pk=pk).exists()
        assert not Car.objects.with_deleted().filter(pk=pk).exists()

    def test_soft_delete_preserves_data(self, sample_car):
        """Test that soft delete preserves all original data."""
        original_brand = sample_car.brand
        original_model = sample_car.model

        sample_car.soft_delete()

        # Data should still be accessible via with_deleted
        retrieved = Car.objects.with_deleted().get(pk=sample_car.pk)
        assert retrieved.brand == original_brand
        assert retrieved.model == original_model

    def test_multiple_soft_deletes_are_idempotent(self, sample_car):
        """Test that calling soft_delete multiple times doesn't break."""
        sample_car.soft_delete()
        first_deleted_at = sample_car.deleted_at

        sample_car.soft_delete()
        sample_car.refresh_from_db()

        # Should still be soft deleted
        assert sample_car.is_deleted is True
        # deleted_at should be updated to the latest call
        assert sample_car.deleted_at >= first_deleted_at

    def test_restore_on_non_deleted_item(self, sample_car):
        """Test that restore on non-deleted item is safe."""
        # Should not raise any errors
        sample_car.restore()
        sample_car.refresh_from_db()

        assert sample_car.is_deleted is False
        assert sample_car.deleted_at is None


# ============================================================================
# SoftDeleteManager Tests
# ============================================================================


@pytest.mark.django_db
class TestSoftDeleteManager:
    """Tests for SoftDeleteManager."""

    def test_get_queryset_excludes_deleted(self, sample_cars):
        """Test that get_queryset excludes soft-deleted items."""
        # Soft delete one car
        sample_cars[0].soft_delete()

        # Default manager should exclude it
        assert Car.objects.count() == len(sample_cars) - 1

    def test_with_deleted_includes_all(self, sample_cars):
        """Test that with_deleted includes all items."""
        sample_cars[0].soft_delete()

        # with_deleted should include all
        assert Car.objects.with_deleted().count() == len(sample_cars)

    def test_deleted_only_returns_only_deleted(self, sample_cars):
        """Test that deleted_only returns only soft-deleted items."""
        sample_cars[0].soft_delete()
        sample_cars[1].soft_delete()

        # deleted_only should return only deleted items
        assert Car.objects.deleted_only().count() == 2
        assert set(Car.objects.deleted_only()) == {sample_cars[0], sample_cars[1]}


# ============================================================================
# SoftDelete with Filtering Tests
# ============================================================================


@pytest.mark.django_db
class TestSoftDeleteWithFiltering:
    """Tests for soft delete combined with filtering."""

    def test_filter_active_excludes_deleted(self, sample_cars):
        """Test that filtering active items excludes soft-deleted."""
        # Soft delete an active car
        active_car = next(c for c in sample_cars if c.is_active)
        active_car.soft_delete()

        # Active cars should exclude the soft-deleted one
        active_cars = Car.objects.filter(is_active=True)
        assert active_car not in active_cars

    def test_filter_by_brand_excludes_deleted(self, sample_cars):
        """Test that filtering by brand excludes soft-deleted."""
        # Soft delete a car
        sample_cars[0].soft_delete()

        # Filter by brand should not include soft-deleted
        brand_cars = Car.objects.filter(brand=sample_cars[0].brand)
        assert sample_cars[0] not in brand_cars

    def test_search_excludes_deleted(self, sample_cars):
        """Test that search excludes soft-deleted items."""
        # Soft delete a car
        sample_cars[0].soft_delete()

        # Search should not find soft-deleted car
        from django.db.models import Q
        search_results = Car.objects.filter(
            Q(brand__icontains=sample_cars[0].brand) |
            Q(model__icontains=sample_cars[0].model)
        )
        assert sample_cars[0] not in search_results


# ============================================================================
# Existing Core Model Tests
# ============================================================================


@pytest.mark.django_db
class TestSiteSettings:
    """Tests for SiteSettings model."""

    def test_load_creates_default(self):
        """Test that load() creates default settings if none exist."""
        settings = SiteSettings.load()
        assert settings.pk == 1
        assert settings.site_name == 'راهنورد خودرو'

    def test_load_returns_existing(self):
        """Test that load() returns existing settings."""
        SiteSettings.objects.create(pk=1, site_name='Test Site')
        settings = SiteSettings.load()
        assert settings.site_name == 'Test Site'

    def test_save_enforces_singleton(self):
        """Test that save() always uses pk=1."""
        settings = SiteSettings(site_name='Test')
        settings.save()
        assert settings.pk == 1

    def test_str_representation(self):
        """Test string representation."""
        settings = SiteSettings.load()
        assert str(settings) == 'راهنورد خودرو'


@pytest.mark.django_db
class TestHeroSlide:
    """Tests for HeroSlide model."""

    def test_create_slide(self):
        """Test creating a hero slide."""
        slide = HeroSlide.objects.create(
            title='Test Slide',
            alt_text='Test alt text',
            is_active=True,
            display_order=1
        )
        assert slide.title == 'Test Slide'
        assert slide.is_active is True

    def test_str_with_title(self):
        """Test string representation with title."""
        slide = HeroSlide.objects.create(title='Test Slide', alt_text='Test')
        assert str(slide) == 'Test Slide'

    def test_str_without_title(self):
        """Test string representation without title."""
        slide = HeroSlide.objects.create(alt_text='Test')
        assert 'اسلاید' in str(slide)

    def test_ordering(self):
        """Test ordering by display_order."""
        HeroSlide.objects.create(alt_text='Second', display_order=2)
        HeroSlide.objects.create(alt_text='First', display_order=1)
        slides = list(HeroSlide.objects.all())
        assert slides[0].display_order == 1
        assert slides[1].display_order == 2


@pytest.mark.django_db
class TestWhyFeature:
    """Tests for WhyFeature model."""

    def test_create_feature(self):
        """Test creating a why feature."""
        feature = WhyFeature.objects.create(
            title='Expertise',
            description='Years of experience',
            is_active=True,
            display_order=1
        )
        assert feature.title == 'Expertise'

    def test_str_representation(self):
        """Test string representation."""
        feature = WhyFeature.objects.create(title='Test', description='Desc')
        assert str(feature) == 'Test'


@pytest.mark.django_db
class TestRedirect:
    """Tests for Redirect model."""

    def test_create_redirect(self):
        """Test creating a redirect."""
        redirect = Redirect.objects.create(
            old_path='/old-path',
            new_path='/new-path',
            status_code=301
        )
        assert redirect.old_path == '/old-path'
        assert redirect.status_code == 301

    def test_str_representation(self):
        """Test string representation."""
        redirect = Redirect.objects.create(
            old_path='/old',
            new_path='/new'
        )
        assert '/old' in str(redirect)
        assert '/new' in str(redirect)


@pytest.mark.django_db
class TestSiteSettingsAPI:
    """Tests for SiteSettings API endpoint."""

    def test_get_settings(self, api_client):
        """Test retrieving site settings."""
        response = api_client.get('/api/v1/settings/')
        assert response.status_code == 200
        assert 'site_name' in response.data

    def test_settings_returns_defaults(self, api_client):
        """Test that settings return default values."""
        response = api_client.get('/api/v1/settings/')
        assert response.data['site_name'] == 'راهنورد خودرو'


@pytest.mark.django_db
class TestHeroSlideAPI:
    """Tests for HeroSlide API endpoint."""

    def test_get_active_slides(self, api_client):
        """Test retrieving active hero slides."""
        HeroSlide.objects.create(alt_text='Active', is_active=True, display_order=1)
        HeroSlide.objects.create(alt_text='Inactive', is_active=False, display_order=2)
        response = api_client.get('/api/v1/hero-slides/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_empty_slides(self, api_client):
        """Test when no slides exist."""
        response = api_client.get('/api/v1/hero-slides/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0


@pytest.mark.django_db
class TestWhyFeatureAPI:
    """Tests for WhyFeature API endpoint."""

    def test_get_active_features(self, api_client):
        """Test retrieving active why features."""
        WhyFeature.objects.create(title='Test', description='Desc', is_active=True, display_order=1)
        response = api_client.get('/api/v1/why-features/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestHomepageDataAPI:
    """Tests for HomepageData API endpoint."""

    def test_get_homepage_data(self, api_client):
        """Test retrieving homepage data."""
        response = api_client.get('/api/v1/homepage/')
        assert response.status_code == 200
        assert 'settings' in response.data
        assert 'hero_slides' in response.data
        assert 'why_features' in response.data
