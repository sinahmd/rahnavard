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


# ============================================================================
# Branch Model Tests
# ============================================================================


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


# ============================================================================
# Branch Soft Delete Tests
# ============================================================================


@pytest.mark.django_db
class TestBranchSoftDelete:
    """Tests for Branch soft delete functionality."""

    def test_soft_delete_branch(self, sample_branch):
        """Test soft deleting a branch."""
        sample_branch.soft_delete()

        sample_branch.refresh_from_db()
        assert sample_branch.is_deleted is True
        assert sample_branch.deleted_at is not None

    def test_soft_delete_hides_from_api(self, api_client, sample_branch):
        """Test that soft-deleted branches don't appear in public API."""
        response = api_client.get('/api/v1/branches/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

        sample_branch.soft_delete()

        response = api_client.get('/api/v1/branches/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0

    def test_soft_delete_still_appears_in_admin_api(self, admin_client, sample_branch):
        """Test that soft-deleted branches still appear in admin API (for management)."""
        response = admin_client.get('/api/v1/admin/branches/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

        sample_branch.soft_delete()

        # Admin should still see soft-deleted items for management
        response = admin_client.get('/api/v1/admin/branches/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_restore_branch(self, sample_branch):
        """Test restoring a soft-deleted branch."""
        sample_branch.soft_delete()
        sample_branch.restore()

        sample_branch.refresh_from_db()
        assert sample_branch.is_deleted is False
        assert sample_branch.deleted_at is None

    def test_restore_makes_visible_in_api(self, api_client, sample_branch):
        """Test that restored branches appear in public API."""
        sample_branch.soft_delete()

        response = api_client.get('/api/v1/branches/')
        assert len(response.data['results']) == 0

        sample_branch.restore()

        response = api_client.get('/api/v1/branches/')
        assert len(response.data['results']) == 1

    def test_hard_delete_branch(self, sample_branch):
        """Test hard deleting a branch."""
        pk = sample_branch.pk
        sample_branch.hard_delete()

        assert not Branch.objects.with_deleted().filter(pk=pk).exists()

    def test_multiple_branches_soft_delete(self, sample_branches):
        """Test soft deleting multiple branches."""
        # Soft delete first 2 branches
        sample_branches[0].soft_delete()
        sample_branches[1].soft_delete()

        # Only 1 should remain visible
        assert Branch.objects.count() == 1

        # 2 should be in deleted_only
        assert Branch.objects.deleted_only().count() == 2

        # All 3 should be in with_deleted
        assert Branch.objects.with_deleted().count() == 3


# ============================================================================
# Branch API Tests
# ============================================================================


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
        """Anonymous admin-list access must be rejected. With session-only
        auth DRF returns 403 (no WWW-Authenticate challenge exists — the
        401 challenge died with TokenAuthentication)."""
        response = api_client.get('/api/v1/admin/branches/')
        assert response.status_code == 403

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

    def test_admin_soft_delete_branch(self, admin_client, sample_branch):
        """Test soft deleting a branch via admin API."""
        response = admin_client.delete(f'/api/v1/admin/branches/{sample_branch.pk}/')
        assert response.status_code == 204

        # Branch should still exist but be soft deleted
        assert Branch.objects.with_deleted().filter(pk=sample_branch.pk).exists()
        assert not Branch.objects.filter(pk=sample_branch.pk).exists()

    def test_admin_restore_branch(self, admin_client, sample_branch):
        """Test restoring a soft-deleted branch via restore endpoint."""
        # First soft delete
        sample_branch.soft_delete()

        # Verify it's soft deleted
        assert sample_branch.is_deleted is True

        # Restore via POST to restore endpoint
        response = admin_client.post(f'/api/v1/admin/branches/{sample_branch.pk}/restore/')
        assert response.status_code == 200

        # Branch should be visible again in public API
        sample_branch.refresh_from_db()
        assert sample_branch.is_deleted is False
        assert Branch.objects.filter(pk=sample_branch.pk).exists()
