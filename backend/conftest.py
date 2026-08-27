import struct
import zlib
import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.cars.models import Car


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
def api_client():
    """Return an API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a regular user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an admin authenticated API client."""
    api_client.force_authenticate(user=admin_user)
    return api_client


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
