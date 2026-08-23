import struct
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from .models import Branch


def _make_tiny_png():
    """Return a minimal valid PNG (1x1 pixel) as bytes."""
    import zlib

    def _chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    raw = zlib.compress(b"\x00\x00\x00\x00")
    return sig + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", raw) + _chunk(b"IEND", b"")


@pytest.fixture
def sample_branch(db):
    """Create a sample branch."""
    return Branch.objects.create(
        name='دفتر مرکزی',
        address='ساری، میدان خزر',
        phone='09112100800',
        map_url='https://maps.google.com',
        is_active=True,
        display_order=1
    )


@pytest.fixture
def sample_branches(db):
    """Create multiple sample branches."""
    branches = []
    for i in range(3):
        branch = Branch.objects.create(
            name=f'شعبه {i}',
            address=f'آدرس {i}',
            phone=f'0911000000{i}',
            map_url='https://maps.google.com',
            is_active=i < 2,  # First 2 are active
            display_order=i
        )
        branches.append(branch)
    return branches


@pytest.mark.django_db
class TestBranchModel:
    """Tests for Branch model."""

    def test_create_branch(self, sample_branch):
        """Test creating a branch."""
        assert sample_branch.name == 'دفتر مرکزی'
        assert sample_branch.is_active is True

    def test_str_representation(self, sample_branch):
        """Test string representation."""
        assert str(sample_branch) == 'دفتر مرکزی'

    def test_ordering(self, sample_branches):
        """Test ordering by display_order."""
        branches = list(Branch.objects.all())
        assert branches[0].display_order <= branches[1].display_order


@pytest.mark.django_db
class TestBranchListView:
    """Tests for Branch list API endpoint."""

    def test_list_active_branches(self, api_client, sample_branches):
        """Test listing only active branches."""
        response = api_client.get('/api/v1/branches/')
        assert response.status_code == 200
        assert len(response.data['results']) == 2  # Only 2 are active

    def test_list_empty(self, api_client):
        """Test listing when no branches exist."""
        response = api_client.get('/api/v1/branches/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0


@pytest.mark.django_db
class TestBranchAdminAPI:
    """Tests for Branch admin API endpoints."""

    def test_admin_list_requires_auth(self, api_client):
        """Test that admin list requires authentication."""
        response = api_client.get('/api/v1/admin/branches/')
        assert response.status_code == 401

    def test_admin_list_with_auth(self, admin_client, sample_branches):
        """Test admin list with authentication."""
        response = admin_client.get('/api/v1/admin/branches/')
        assert response.status_code == 200
        assert len(response.data['results']) == 3  # All branches

    def test_admin_create_branch(self, admin_client):
        """Test creating a branch via admin API."""
        data = {
            'name': 'شعبه جدید',
            'address': 'آدرس جدید',
            'phone': '09119999999',
            'map_url': 'https://maps.google.com',
            'map_image': SimpleUploadedFile('map.png', _make_tiny_png(), 'image/png'),
            'is_active': True
        }
        response = admin_client.post('/api/v1/admin/branches/', data, format='multipart')
        assert response.status_code == 201

    def test_admin_update_branch(self, admin_client, sample_branch):
        """Test updating a branch via admin API."""
        data = {'name': 'نام جدید'}
        response = admin_client.patch(
            f'/api/v1/admin/branches/{sample_branch.pk}/',
            data,
            format='json'
        )
        assert response.status_code == 200
        assert response.data['name'] == 'نام جدید'

    def test_admin_delete_branch(self, admin_client, sample_branch):
        """Test deleting a branch via admin API."""
        response = admin_client.delete(f'/api/v1/admin/branches/{sample_branch.pk}/')
        assert response.status_code == 204
        assert Branch.objects.count() == 0
