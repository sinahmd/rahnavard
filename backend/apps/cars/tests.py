import os
import struct
import zlib
import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from .models import Car


def _make_tiny_png():
    """Return a minimal valid PNG (1x1 pixel) as bytes."""

    def _chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    raw = zlib.compress(b"\x00\x00\x00\x00")
    return sig + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", raw) + _chunk(b"IEND", b"")


@pytest.fixture
def sample_car(db):
    """Create a sample car."""
    return Car.objects.create(
        brand='Toyota',
        model='RAV4',
        persian_name='تویوتا راو۴',
        slug='toyota-rav4',
        year=2025,
        fuel_type='hybrid',
        transmission='automatic',
        engine='2.5L Hybrid',
        is_active=True,
        is_featured=True,
        display_order=1,
        main_image=SimpleUploadedFile(
            name='test.jpg',
            content=b'',
            content_type='image/jpeg'
        )
    )


@pytest.fixture
def sample_cars(db):
    """Create multiple sample cars."""
    cars = []
    for i in range(5):
        car = Car.objects.create(
            brand=f'Brand{i}',
            model=f'Model{i}',
            persian_name=f'خودرو {i}',
            slug=f'car-{i}',
            year=2025,
            fuel_type='gasoline',
            transmission='automatic',
            is_active=i < 3,  # First 3 are active
            is_featured=i == 0,
            display_order=i,
            main_image=SimpleUploadedFile(
                name=f'car{i}.jpg',
                content=b'',
                content_type='image/jpeg'
            )
        )
        cars.append(car)
    return cars


# ============================================================================
# Car Model Tests
# ============================================================================


@pytest.mark.django_db
class TestCarModel:
    """Tests for Car model."""

    def test_create_car(self, sample_car):
        """Test creating a car."""
        assert sample_car.brand == 'Toyota'
        assert sample_car.model == 'RAV4'
        assert sample_car.slug == 'toyota-rav4'

    def test_str_representation(self, sample_car):
        """Test string representation."""
        assert str(sample_car) == 'Toyota RAV4'

    def test_auto_slug_generation(self, db):
        """Test automatic slug generation."""
        car = Car.objects.create(
            brand='Honda',
            model='Civic',
            persian_name='هوندا سیویک',
            year=2025,
            fuel_type='gasoline',
            transmission='automatic',
            main_image=SimpleUploadedFile('test.jpg', b'', 'image/jpeg')
        )
        assert car.slug is not None
        assert len(car.slug) > 0

    def test_unique_slug(self, db, sample_car):
        """Test that slugs are unique."""
        car = Car.objects.create(
            brand='Toyota',
            model='RAV4',
            persian_name='تویوتا راو۴ ۲',
            year=2026,
            fuel_type='gasoline',
            transmission='automatic',
            main_image=SimpleUploadedFile('test.jpg', b'', 'image/jpeg')
        )
        # Auto-generated slug should differ from sample_car's slug
        assert car.slug != sample_car.slug

    def test_ordering(self, sample_cars):
        """Test ordering by display_order."""
        cars = list(Car.objects.all())
        assert cars[0].display_order <= cars[1].display_order


# ============================================================================
# Car Soft Delete Tests
# ============================================================================


@pytest.mark.django_db
class TestCarSoftDelete:
    """Tests for Car soft delete functionality."""

    def test_soft_delete_car(self, sample_car):
        """Test soft deleting a car."""
        sample_car.soft_delete()

        sample_car.refresh_from_db()
        assert sample_car.is_deleted is True
        assert sample_car.deleted_at is not None

    def test_soft_delete_hides_from_api(self, api_client, sample_car):
        """Test that soft-deleted cars don't appear in public API."""
        response = api_client.get('/api/v1/cars/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

        sample_car.soft_delete()

        response = api_client.get('/api/v1/cars/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0

    def test_soft_delete_still_appears_in_admin_api(self, admin_client, sample_car):
        """Test that soft-deleted cars still appear in admin API (for management)."""
        response = admin_client.get('/api/v1/admin/cars/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

        sample_car.soft_delete()

        # Admin should still see soft-deleted items for management
        response = admin_client.get('/api/v1/admin/cars/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_restore_car(self, sample_car):
        """Test restoring a soft-deleted car."""
        sample_car.soft_delete()
        sample_car.restore()

        sample_car.refresh_from_db()
        assert sample_car.is_deleted is False
        assert sample_car.deleted_at is None

    def test_restore_makes_visible_in_api(self, api_client, sample_car):
        """Test that restored cars appear in public API."""
        sample_car.soft_delete()

        response = api_client.get('/api/v1/cars/')
        assert len(response.data['results']) == 0

        sample_car.restore()

        response = api_client.get('/api/v1/cars/')
        assert len(response.data['results']) == 1

    def test_hard_delete_car(self, sample_car):
        """Test hard deleting a car."""
        pk = sample_car.pk
        sample_car.hard_delete()

        assert not Car.objects.with_deleted().filter(pk=pk).exists()

    def test_soft_deleted_car_detail_404(self, api_client, sample_car):
        """Test that soft-deleted car returns 404 on detail."""
        response = api_client.get(f'/api/v1/cars/{sample_car.slug}/')
        assert response.status_code == 200

        sample_car.soft_delete()

        response = api_client.get(f'/api/v1/cars/{sample_car.slug}/')
        assert response.status_code == 404

    def test_slug_reuse_after_soft_delete(self, db, sample_car):
        """Test that slug can be reused after soft-deleting the original."""
        original_slug = sample_car.slug
        sample_car.soft_delete()

        # Should be able to create a new car with the same slug
        new_car = Car.objects.create(
            brand='Honda',
            model='CRV',
            persian_name='هوندا CRV',
            slug=original_slug,
            year=2025,
            fuel_type='gasoline',
            transmission='automatic',
            main_image=SimpleUploadedFile('test.jpg', b'', 'image/jpeg')
        )
        assert new_car.slug == original_slug

    def test_slug_rejected_when_active_exists(self, db, sample_car):
        """Test that slug is rejected when an active record has it."""
        import pytest
        from django.db import IntegrityError

        with pytest.raises(IntegrityError):
            Car.objects.create(
                brand='Honda',
                model='CRV',
                persian_name='هوندا CRV',
                slug=sample_car.slug,  # Same slug
                year=2025,
                fuel_type='gasoline',
                transmission='automatic',
                main_image=SimpleUploadedFile('test.jpg', b'', 'image/jpeg')
            )

    def test_multiple_cars_soft_delete(self, sample_cars):
        """Test soft deleting multiple cars."""
        # Soft delete first 2 cars
        sample_cars[0].soft_delete()
        sample_cars[1].soft_delete()

        # Only 3 should remain visible
        assert Car.objects.count() == 3

        # 2 should be in deleted_only
        assert Car.objects.deleted_only().count() == 2

        # All 5 should be in with_deleted
        assert Car.objects.with_deleted().count() == 5


# ============================================================================
# Car API Tests
# ============================================================================


@pytest.mark.django_db
class TestCarListView:
    """Tests for Car list API endpoint."""

    def test_list_active_cars(self, api_client, sample_cars):
        """Test listing only active cars."""
        response = api_client.get('/api/v1/cars/')
        assert response.status_code == 200
        assert len(response.data['results']) == 3  # Only 3 are active

    def test_list_empty(self, api_client):
        """Test listing when no cars exist."""
        response = api_client.get('/api/v1/cars/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0

    def test_filter_by_brand(self, api_client, sample_cars):
        """Test filtering cars by brand."""
        response = api_client.get('/api/v1/cars/?brand=Brand0')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_filter_featured(self, api_client, sample_cars):
        """Test filtering featured cars."""
        response = api_client.get('/api/v1/cars/?is_featured=true')
        assert response.status_code == 200
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestCarDetailView:
    """Tests for Car detail API endpoint."""

    def test_get_car_detail(self, api_client, sample_car):
        """Test retrieving car detail."""
        response = api_client.get(f'/api/v1/cars/{sample_car.slug}/')
        assert response.status_code == 200
        assert response.data['brand'] == 'Toyota'
        assert response.data['model'] == 'RAV4'

    def test_car_not_found(self, api_client):
        """Test 404 for non-existent car."""
        response = api_client.get('/api/v1/cars/non-existent/')
        assert response.status_code == 404


@pytest.mark.django_db
class TestCarAdminAPI:
    """Tests for Car admin API endpoints."""

    def test_admin_list_requires_auth(self, api_client):
        """Test that admin list requires authentication."""
        response = api_client.get('/api/v1/admin/cars/')
        assert response.status_code == 401

    def test_admin_list_with_auth(self, admin_client, sample_cars):
        """Test admin list with authentication."""
        response = admin_client.get('/api/v1/admin/cars/')
        assert response.status_code == 200
        assert len(response.data['results']) == 5  # All cars

    def test_admin_create_car(self, admin_client):
        """Test creating a car via admin API."""
        data = {
            'brand': 'Honda',
            'model': 'Civic',
            'persian_name': 'هوندا سیویک',
            'slug': 'honda-civic',
            'year': 2025,
            'fuel_type': 'gasoline',
            'transmission': 'automatic',
            'is_active': True,
            'main_image': SimpleUploadedFile('test.png', _make_tiny_png(), 'image/png')
        }
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 201

    def test_admin_update_car(self, admin_client, sample_car):
        """Test updating a car via admin API."""
        data = {'brand': 'Updated Brand'}
        response = admin_client.patch(
            f'/api/v1/admin/cars/{sample_car.pk}/',
            data,
            format='json'
        )
        assert response.status_code == 200
        assert response.data['brand'] == 'Updated Brand'

    def test_admin_create_sanitizes_technical_description(self, admin_client):
        """Dirty HTML posted via the admin API never reaches the database."""
        data = {
            'brand': 'Honda',
            'model': 'Civic',
            'persian_name': 'هوندا سیویک',
            'slug': 'honda-civic-xss',
            'year': 2025,
            'fuel_type': 'gasoline',
            'transmission': 'automatic',
            'is_active': True,
            'technical_description': (
                '<p>متن</p><script>alert(1)</script>'
                '<img src="x" onerror="alert(1)">'
                '<a href="JaVaScRiPt:alert(1)">bad</a>'
            ),
            'main_image': SimpleUploadedFile('test.png', _make_tiny_png(), 'image/png')
        }
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 201

        stored = Car.objects.get(slug='honda-civic-xss')
        assert '<script' not in stored.technical_description
        assert 'onerror' not in stored.technical_description
        assert 'javascript:' not in stored.technical_description
        assert 'متن' in stored.technical_description

    def test_admin_update_sanitizes_technical_description(
        self, admin_client, sample_car
    ):
        """Dirty HTML posted via PATCH is sanitized before storage."""
        response = admin_client.patch(
            f'/api/v1/admin/cars/{sample_car.pk}/',
            {'technical_description': '<p>x</p><a href="javascript:alert(1)">bad</a>'},
            format='json'
        )
        assert response.status_code == 200

        sample_car.refresh_from_db()
        assert 'javascript:' not in sample_car.technical_description
        assert 'x' in sample_car.technical_description

    def test_admin_soft_delete_car(self, admin_client, sample_car):
        """Test soft deleting a car via admin API (DELETE now does soft delete)."""
        response = admin_client.delete(f'/api/v1/admin/cars/{sample_car.pk}/')
        assert response.status_code == 204

        # Car should still exist but be soft deleted
        assert Car.objects.with_deleted().filter(pk=sample_car.pk).exists()
        assert not Car.objects.filter(pk=sample_car.pk).exists()

    def test_admin_restore_car_via_endpoint(self, admin_client, sample_car):
        """Test restoring a soft-deleted car via restore endpoint."""
        # First soft delete
        sample_car.soft_delete()
        assert sample_car.is_deleted is True

        # Restore via POST to restore endpoint
        response = admin_client.post(f'/api/v1/admin/cars/{sample_car.pk}/restore/')
        assert response.status_code == 200

        # Car should be visible again in public API
        sample_car.refresh_from_db()
        assert sample_car.is_deleted is False
        assert Car.objects.filter(pk=sample_car.pk).exists()

    def test_admin_restore_non_deleted_car_fails(self, admin_client, sample_car):
        """Test that restoring a non-deleted car returns 400."""
        response = admin_client.post(f'/api/v1/admin/cars/{sample_car.pk}/restore/')
        assert response.status_code == 400
        assert 'not soft-deleted' in response.data['detail']

    def test_instance_delete_performs_soft_delete(self, admin_client, sample_car):
        """Test that instance.delete() performs soft delete."""
        pk = sample_car.pk
        sample_car.delete()

        # Should still exist in database
        assert Car.objects.with_deleted().filter(pk=pk).exists()
        # Should be soft-deleted
        assert not Car.objects.filter(pk=pk).exists()

    def test_queryset_delete_performs_soft_delete(self, sample_cars):
        """Test that QuerySet.delete() performs soft delete."""
        pks = [c.pk for c in sample_cars]

        # Bulk soft delete via queryset
        Car.objects.filter(pk__in=pks[:2]).delete()

        # All should still exist in database
        for pk in pks:
            assert Car.objects.with_deleted().filter(pk=pk).exists()

        # First 2 should be soft-deleted
        for pk in pks[:2]:
            assert not Car.objects.filter(pk=pk).exists()

    def test_hard_delete_removes_permanently(self, sample_car):
        """Test that hard_delete permanently removes the record."""
        pk = sample_car.pk
        sample_car.hard_delete()

        # Should not appear in any queryset
        assert not Car.objects.with_deleted().filter(pk=pk).exists()


@pytest.mark.django_db
class TestCarNewFields:
    """Tests for the new general specs, technical description, and PDF catalogue fields."""

    def test_create_car_with_new_fields(self, sample_car):
        """All new fields can be saved on the model."""
        sample_car.manufacturer = "ژاپن"
        sample_car.body_type = "سدان"
        sample_car.color = "خاکستری"
        sample_car.technical_description = "<p>توضیحات فنی نمونه</p>"
        sample_car.catalog_file = SimpleUploadedFile(
            "catalog.pdf", b"%PDF-1.4\n%", content_type="application/pdf"
        )
        sample_car.save()
        sample_car.refresh_from_db()

        assert sample_car.manufacturer == "ژاپن"
        assert sample_car.body_type == "سدان"
        assert sample_car.color == "خاکستری"
        assert sample_car.technical_description == "<p>توضیحات فنی نمونه</p>"
        assert sample_car.catalog_file.name.endswith(".pdf")

    def test_detail_serializer_returns_new_fields(self, api_client, sample_car):
        """Public detail endpoint exposes the new fields."""
        sample_car.manufacturer = "کره"
        sample_car.body_type = "شاسی‌بلند"
        sample_car.color = "سفید"
        sample_car.technical_description = "توضیحات"
        sample_car.save()

        response = api_client.get(f"/api/v1/cars/{sample_car.slug}/")
        assert response.status_code == 200
        data = response.data
        assert data["manufacturer"] == "کره"
        assert data["body_type"] == "شاسی‌بلند"
        assert data["color"] == "سفید"
        assert data["technical_description"] == "توضیحات"
        # catalog_file is a URL string (or null when empty)
        assert data["catalog_file"] is None

    def test_admin_can_update_new_fields(self, admin_client, sample_car):
        """Admin serializer allows updating the new fields."""
        data = {
            "manufacturer": "آلمان",
            "body_type": "سدان",
            "color": "مشکی",
            "technical_description": "متن جدید",
        }
        response = admin_client.patch(
            f"/api/v1/admin/cars/{sample_car.pk}/", data, format="json"
        )
        assert response.status_code == 200
        assert response.data["manufacturer"] == "آلمان"
        assert response.data["body_type"] == "سدان"
        assert response.data["color"] == "مشکی"
        assert response.data["technical_description"] == "متن جدید"


# ============================================================================
# Car Search, Filtering & Pagination Tests
# ============================================================================


@pytest.fixture
def filter_cars(db):
    """Create cars with varied attributes for filter testing."""
    cars = []
    specs = [
        {"brand": "Toyota", "model": "RAV4", "persian_name": "تویوتا راو۴", "slug": "toyota-rav4",
         "year": 2025, "fuel_type": "hybrid", "transmission": "automatic", "price": 1500000000, "body_type": "شاسی‌بلند", "is_active": True},
        {"brand": "Hyundai", "model": "Elantra", "persian_name": "هیوندای النترا", "slug": "hyundai-elantra",
         "year": 2024, "fuel_type": "gasoline", "transmission": "automatic", "price": 900000000, "body_type": "سدان", "is_active": True},
        {"brand": "Kia", "model": "Sportage", "persian_name": "کیا اسپورتیج", "slug": "kia-sportage",
         "year": 2025, "fuel_type": "gasoline", "transmission": "automatic", "price": 1200000000, "body_type": "شاسی‌بلند", "is_active": True},
        {"brand": "Toyota", "model": "Corolla", "persian_name": "تویوتا کرولا", "slug": "toyota-corolla",
         "year": 2023, "fuel_type": "gasoline", "transmission": "manual", "price": 800000000, "body_type": "سدان", "is_active": True},
        {"brand": "Hyundai", "model": "Tucson", "persian_name": "هیوندای توسان", "slug": "hyundai-tucson",
         "year": 2025, "fuel_type": "hybrid", "transmission": "automatic", "price": 1800000000, "body_type": "شاسی‌بلند", "is_active": True},
    ]
    for i, spec in enumerate(specs):
        car = Car.objects.create(
            display_order=i,
            main_image=SimpleUploadedFile(f'car{i}.jpg', b'', 'image/jpeg'),
            **spec,
        )
        cars.append(car)
    return cars


@pytest.mark.django_db
class TestCarSearch:
    """Tests for search functionality on the car listing endpoint."""

    def test_search_by_brand(self, api_client, filter_cars):
        """Search finds cars by brand name."""
        response = api_client.get('/api/v1/cars/?search=Toyota')
        assert response.status_code == 200
        assert response.data['count'] == 2

    def test_search_by_model(self, api_client, filter_cars):
        """Search finds cars by model name."""
        response = api_client.get('/api/v1/cars/?search=Elantra')
        assert response.status_code == 200
        assert response.data['count'] == 1
        assert response.data['results'][0]['model'] == 'Elantra'

    def test_search_by_persian_name(self, api_client, filter_cars):
        """Search finds cars by Persian name."""
        response = api_client.get('/api/v1/cars/?search=کیا')
        assert response.status_code == 200
        assert response.data['count'] == 1

    def test_search_no_results(self, api_client, filter_cars):
        """Search returns empty when nothing matches."""
        response = api_client.get('/api/v1/cars/?search=BMW')
        assert response.status_code == 200
        assert response.data['count'] == 0

    def test_search_combined_with_filter(self, api_client, filter_cars):
        """Search and filter can be combined."""
        response = api_client.get('/api/v1/cars/?search=Toyota&fuel_type=hybrid')
        assert response.status_code == 200
        assert response.data['count'] == 1
        assert response.data['results'][0]['model'] == 'RAV4'


@pytest.mark.django_db
class TestCarFiltering:
    """Tests for filter functionality on the car listing endpoint."""

    def test_filter_by_brand(self, api_client, filter_cars):
        """Filter cars by exact brand."""
        response = api_client.get('/api/v1/cars/?brand=Toyota')
        assert response.status_code == 200
        assert response.data['count'] == 2

    def test_filter_by_fuel_type(self, api_client, filter_cars):
        """Filter cars by fuel type."""
        response = api_client.get('/api/v1/cars/?fuel_type=hybrid')
        assert response.status_code == 200
        assert response.data['count'] == 2

    def test_filter_by_transmission(self, api_client, filter_cars):
        """Filter cars by transmission type."""
        response = api_client.get('/api/v1/cars/?transmission=manual')
        assert response.status_code == 200
        assert response.data['count'] == 1

    def test_filter_by_body_type(self, api_client, filter_cars):
        """Filter cars by body type."""
        response = api_client.get('/api/v1/cars/?body_type=سدان')
        assert response.status_code == 200
        assert response.data['count'] == 2

    def test_filter_by_price_range(self, api_client, filter_cars):
        """Filter cars by price range."""
        response = api_client.get('/api/v1/cars/?min_price=1000000000&max_price=1600000000')
        assert response.status_code == 200
        assert response.data['count'] == 2
        prices = [int(c['price']) for c in response.data['results']]
        assert all(1000000000 <= p <= 1600000000 for p in prices)

    def test_filter_by_year_range(self, api_client, filter_cars):
        """Filter cars by year range."""
        response = api_client.get('/api/v1/cars/?min_year=2024&max_year=2025')
        assert response.status_code == 200
        assert response.data['count'] == 4

    def test_filter_combined(self, api_client, filter_cars):
        """Multiple filters can be combined."""
        response = api_client.get('/api/v1/cars/?brand=Toyota&fuel_type=hybrid')
        assert response.status_code == 200
        assert response.data['count'] == 1

    def test_filter_no_results(self, api_client, filter_cars):
        """Filters return empty when no matches."""
        response = api_client.get('/api/v1/cars/?body_type=کوپه')
        assert response.status_code == 200
        assert response.data['count'] == 0


@pytest.mark.django_db
class TestCarOrdering:
    """Tests for ordering functionality."""

    def test_order_by_price_ascending(self, api_client, filter_cars):
        """Order cars by price ascending."""
        response = api_client.get('/api/v1/cars/?ordering=price')
        assert response.status_code == 200
        prices = [int(c['price']) for c in response.data['results']]
        assert prices == sorted(prices)

    def test_order_by_price_descending(self, api_client, filter_cars):
        """Order cars by price descending."""
        response = api_client.get('/api/v1/cars/?ordering=-price')
        assert response.status_code == 200
        prices = [int(c['price']) for c in response.data['results']]
        assert prices == sorted(prices, reverse=True)

    def test_order_by_year(self, api_client, filter_cars):
        """Order cars by year."""
        response = api_client.get('/api/v1/cars/?ordering=-year')
        assert response.status_code == 200
        years = [c['year'] for c in response.data['results']]
        assert years == sorted(years, reverse=True)


@pytest.mark.django_db
class TestCarPagination:
    """Tests for pagination behavior."""

    def test_pagination_structure(self, api_client, filter_cars):
        """Response has correct pagination structure."""
        response = api_client.get('/api/v1/cars/')
        assert response.status_code == 200
        assert 'count' in response.data
        assert 'results' in response.data
        assert isinstance(response.data['results'], list)

    def test_pagination_page_param(self, api_client, filter_cars):
        """Pagination respects page parameter."""
        response = api_client.get('/api/v1/cars/?page=1')
        assert response.status_code == 200
        assert len(response.data['results']) <= 20  # PAGE_SIZE


@pytest.mark.django_db
class TestCarFilterOptions:
    """Tests for the filter options endpoint."""

    def test_filter_options_returns_correct_structure(self, api_client, filter_cars):
        """Filter options endpoint returns all expected keys."""
        response = api_client.get('/api/v1/cars/filters/')
        assert response.status_code == 200
        data = response.data
        assert 'brands' in data
        assert 'body_types' in data
        assert 'fuel_types' in data
        assert 'transmissions' in data
        assert 'min_year' in data
        assert 'max_year' in data
        assert 'min_price' in data
        assert 'max_price' in data

    def test_filter_options_brands(self, api_client, filter_cars):
        """Filter options returns distinct brands."""
        response = api_client.get('/api/v1/cars/filters/')
        brands = response.data['brands']
        assert 'Toyota' in brands
        assert 'Hyundai' in brands
        assert 'Kia' in brands
        assert len(brands) == 3

    def test_filter_options_body_types(self, api_client, filter_cars):
        """Filter options returns distinct body types."""
        response = api_client.get('/api/v1/cars/filters/')
        body_types = response.data['body_types']
        assert 'سدان' in body_types
        assert 'شاسی‌بلند' in body_types

    def test_filter_options_year_range(self, api_client, filter_cars):
        """Filter options returns correct year range."""
        response = api_client.get('/api/v1/cars/filters/')
        assert response.data['min_year'] == 2023
        assert response.data['max_year'] == 2025

    def test_filter_options_price_range(self, api_client, filter_cars):
        """Filter options returns correct price range."""
        response = api_client.get('/api/v1/cars/filters/')
        assert response.data['min_price'] == 800000000
        assert response.data['max_price'] == 1800000000

    def test_filter_options_empty_db(self, api_client):
        """Filter options returns empty values when no cars exist."""
        response = api_client.get('/api/v1/cars/filters/')
        assert response.status_code == 200
        assert response.data['brands'] == []
        assert response.data['min_year'] is None
        assert response.data['max_price'] is None


# ============================================================================
# Edge Cases & Robustness Tests
# ============================================================================


@pytest.mark.django_db
class TestCarEdgeCases:
    """Tests for edge cases and robustness."""

    def test_invalid_filter_values_return_400(self, api_client, filter_cars):
        """Invalid filter values return 400 validation error."""
        response = api_client.get('/api/v1/cars/?min_price=abc')
        assert response.status_code == 400

    def test_out_of_range_page_returns_404(self, api_client, filter_cars):
        """Out-of-range page returns 404 (DRF PageNumberPagination behavior)."""
        response = api_client.get('/api/v1/cars/?page=999')
        assert response.status_code == 404

    def test_non_numeric_page_returns_404(self, api_client, filter_cars):
        """Non-numeric page parameter returns 404."""
        response = api_client.get('/api/v1/cars/?page=abc')
        assert response.status_code == 404

    def test_search_combined_with_filter_ordering_and_pagination(self, api_client, filter_cars):
        """Search + filter + ordering + pagination work together."""
        response = api_client.get('/api/v1/cars/?search=Toyota&fuel_type=hybrid&ordering=-price')
        assert response.status_code == 200
        assert response.data['count'] == 1
        assert response.data['results'][0]['model'] == 'RAV4'

    def test_is_featured_filter(self, api_client, filter_cars):
        """is_featured filter works correctly."""
        # Add a featured car
        Car.objects.create(
            brand='Honda',
            model='CRV',
            persian_name='هوندا CRV',
            slug='honda-crv-featured',
            year=2025,
            fuel_type='gasoline',
            transmission='automatic',
            price=1000000000,
            body_type='شاسی‌بلند',
            is_active=True,
            is_featured=True,
            display_order=10,
            main_image=SimpleUploadedFile('featured.jpg', b'', 'image/jpeg'),
        )
        response = api_client.get('/api/v1/cars/?is_featured=true')
        assert response.status_code == 200
        assert response.data['count'] == 1
        assert response.data['results'][0]['brand'] == 'Honda'

    def test_ordering_with_filters(self, api_client, filter_cars):
        """Ordering works correctly with active filters."""
        response = api_client.get('/api/v1/cars/?brand=Toyota&ordering=price')
        assert response.status_code == 200
        prices = [int(c['price']) for c in response.data['results']]
        assert prices == sorted(prices)

    def test_invalid_ordering_field_ignored(self, api_client, filter_cars):
        """Ordering by a non-whitelisted field is safely handled."""
        response = api_client.get('/api/v1/cars/?ordering=secret_field')
        assert response.status_code == 200
        assert response.data['count'] == 5  # All returned, just not sorted by that field

    def test_search_empty_string(self, api_client, filter_cars):
        """Empty search string returns all cars."""
        response = api_client.get('/api/v1/cars/?search=')
        assert response.status_code == 200
        assert response.data['count'] == 5

    def test_persian_search_case_insensitive(self, api_client, db):
        """Search for Persian text works."""
        Car.objects.create(
            brand='Test',
            model='Car',
            persian_name='خودروی آزمایشی',
            slug='test-car-persian',
            year=2025,
            fuel_type='gasoline',
            transmission='automatic',
            is_active=True,
            display_order=0,
            main_image=SimpleUploadedFile('t.jpg', b'', 'image/jpeg'),
        )
        response = api_client.get('/api/v1/cars/?search=آزمایشی')
        assert response.status_code == 200
        assert response.data['count'] == 1


@pytest.mark.django_db
class TestCarAdminGalleryAndPagination:
    """Tests for the admin gallery_0..N upload convention and list pagination.

    These pin the wire contract the frontend form split relies on: multipart
    gallery files arrive as gallery_0..N (see frontend/lib/api/formData.ts),
    edits preserve existing gallery URLs, catalog uploads work through the
    admin API, and the paginated admin list exposes the page_size envelope
    key while 404-ing out-of-range pages (the frontend AdminListPage falls
    back to the previous page on that 404).
    """

    def _car_data(self, slug):
        return {
            'brand': 'Toyota',
            'model': 'RAV4',
            'persian_name': 'تویوتا راو۴',
            'slug': slug,
            'year': 2025,
            'fuel_type': 'gasoline',
            'transmission': 'automatic',
            'is_active': True,
            'main_image': SimpleUploadedFile('main.png', _make_tiny_png(), 'image/png'),
        }

    def _gallery_files(self, count):
        return {
            f'gallery_{i}': SimpleUploadedFile(f'g{i}.png', _make_tiny_png(), 'image/png')
            for i in range(count)
        }

    @staticmethod
    def _cleanup_media(paths):
        for path in paths:
            if os.path.exists(path):
                os.remove(path)

    def test_admin_create_with_gallery_files(self, admin_client):
        """gallery_0..N multipart keys are stored as a gallery URL list on disk."""
        data = self._car_data('gallery-create')
        data.update(self._gallery_files(2))
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 201

        car = Car.objects.get(slug='gallery-create')
        assert len(car.gallery) == 2
        created = []
        for url in car.gallery:
            relative = url.replace(settings.MEDIA_URL, '')
            path = os.path.join(settings.MEDIA_ROOT, relative)
            assert os.path.exists(path)
            created.append(path)
        self._cleanup_media(created)

    def test_admin_update_preserves_existing_gallery_and_appends(self, admin_client, sample_car):
        """A PATCH with new gallery files keeps existing URLs and appends."""
        sample_car.gallery = [f'{settings.MEDIA_URL}cars/gallery/existing.jpg']
        sample_car.save()

        response = admin_client.patch(
            f'/api/v1/admin/cars/{sample_car.pk}/',
            {**self._gallery_files(1)},
            format='multipart',
        )
        assert response.status_code == 200

        sample_car.refresh_from_db()
        assert sample_car.gallery[0].endswith('existing.jpg')
        assert len(sample_car.gallery) == 2
        # The new file must NOT reuse the first image's filename: the counter
        # continues past the existing gallery (`_gallery_1.png`), so an
        # edit-append never overwrites the disk file of an existing image.
        assert sample_car.gallery[1] != sample_car.gallery[0]
        assert sample_car.gallery[1].endswith(f'{sample_car.slug}_gallery_1.png')

        created = []
        for url in sample_car.gallery:
            relative = url.replace(settings.MEDIA_URL, '')
            path = os.path.join(settings.MEDIA_ROOT, relative)
            if url != f'{settings.MEDIA_URL}cars/gallery/existing.jpg':
                created.append(path)
        self._cleanup_media(created)

    def test_admin_create_with_catalog_file(self, admin_client):
        """catalog_file uploads through the admin multipart API."""
        data = self._car_data('catalog-create')
        data['catalog_file'] = SimpleUploadedFile(
            'catalog.pdf', b'%PDF-1.4\n%', 'application/pdf'
        )
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 201
        assert response.data['catalog_file'].endswith('.pdf')

        car = Car.objects.get(slug='catalog-create')
        path = os.path.join(settings.MEDIA_ROOT, car.catalog_file.name)
        assert os.path.exists(path)
        self._cleanup_media([path])

    @staticmethod
    def _make_cars(count):
        for i in range(count):
            Car.objects.create(
                brand='Toyota',
                model='RAV4',
                persian_name=f'خودرو {i}',
                slug=f'page-car-{i}',
                year=2025,
                fuel_type='gasoline',
                transmission='automatic',
                is_active=True,
                main_image='cars/page.jpg',
            )

    def test_admin_list_pagination_second_page(self, admin_client):
        """25 cars paginate: page 2 holds the remainder and the envelope
        carries page_size so the frontend can derive total pages."""
        self._make_cars(25)
        response = admin_client.get('/api/v1/admin/cars/', {'page': 2})
        assert response.status_code == 200
        assert response.data['count'] == 25
        assert response.data['page_size'] == 20
        assert len(response.data['results']) == 5

    def test_admin_list_out_of_range_page_returns_404(self, admin_client):
        """An out-of-range page 404s (the frontend falls back a page on this)."""
        self._make_cars(25)
        response = admin_client.get('/api/v1/admin/cars/', {'page': 999})
        assert response.status_code == 404

    def test_admin_create_duplicate_slug_returns_400_field_error(self, admin_client, sample_car):
        """Creating a car with an already-active slug maps to a 400 slug field
        error (not an unhandled IntegrityError 500) — the admin form shows
        field errors only from 400 responses."""
        data = self._car_data(sample_car.slug)
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 400
        assert 'slug' in response.data

        # The failed insert may have written main.png before the DB raised.
        self._cleanup_media([os.path.join(settings.MEDIA_ROOT, 'cars', 'main.png')])

    def test_distinct_active_cars_do_not_collide_gallery_files(self, admin_client):
        """Two different active cars uploading gallery_0..N never produce the
        same on-disk filename.

        Gallery files are named `{slug}_gallery_{idx}` (slug-based, accepted
        technical debt — see DEVELOPMENT.md §3.9). Collisions are prevented
        by the `car_slug_unique_when_not_deleted` partial unique index: two
        active cars always have distinct slugs, hence distinct filenames even
        at the same image index. This test pins that guarantee through the
        real admin API (and would fail loudly if the scheme changed to one
        that could collide)."""
        urls = []
        paths = []
        for slug in ('gallery-a', 'gallery-b'):
            data = self._car_data(slug)
            data.update(self._gallery_files(2))
            response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
            assert response.status_code == 201

            car = Car.objects.get(slug=slug)
            assert len(car.gallery) == 2
            for url in car.gallery:
                relative = url.replace(settings.MEDIA_URL, '')
                path = os.path.join(settings.MEDIA_ROOT, relative)
                assert os.path.exists(path)
                urls.append(url)
                paths.append(path)

        # Four distinct URLs and four distinct files across the two cars.
        assert len(set(urls)) == 4
        assert len(set(paths)) == 4

        paths.append(os.path.join(settings.MEDIA_ROOT, 'cars', 'main.png'))
        self._cleanup_media(paths)
