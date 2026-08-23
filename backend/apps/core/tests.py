import pytest
from django.test import TestCase
from rest_framework.test import APIClient

from .models import HeroSlide, Redirect, SiteSettings, WhyFeature


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
