import struct
import zlib
import pytest
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

    def test_admin_delete_car(self, admin_client, sample_car):
        """Test deleting a car via admin API."""
        response = admin_client.delete(f'/api/v1/admin/cars/{sample_car.pk}/')
        assert response.status_code == 204
        assert Car.objects.count() == 0
