import pytest
from rest_framework.test import APIClient

from .models import Inquiry


@pytest.fixture
def sample_inquiry(db):
    """Create a sample inquiry."""
    return Inquiry.objects.create(
        name='علی محمدی',
        phone='09121234567',
        subject='استعلام قیمت',
        message='لطفا قیمت RAV4 را بفرمایید.',
        ip_address='127.0.0.1'
    )


@pytest.fixture
def sample_inquiries(db):
    """Create multiple sample inquiries."""
    inquiries = []
    for i in range(5):
        inquiry = Inquiry.objects.create(
            name=f'کاربر {i}',
            phone=f'0912000000{i}',
            subject=f'موضوع {i}',
            message=f'پیام {i}',
            is_read=i < 2,
            is_contacted=i < 1
        )
        inquiries.append(inquiry)
    return inquiries


@pytest.mark.django_db
class TestInquiryModel:
    """Tests for Inquiry model."""

    def test_create_inquiry(self, sample_inquiry):
        """Test creating an inquiry."""
        assert sample_inquiry.name == 'علی محمدی'
        assert sample_inquiry.phone == '09121234567'

    def test_str_representation(self, sample_inquiry):
        """Test string representation."""
        assert 'علی محمدی' in str(sample_inquiry)
        assert 'استعلام قیمت' in str(sample_inquiry)

    def test_str_without_subject(self, db):
        """Test string representation without subject."""
        inquiry = Inquiry.objects.create(name='Test', phone='123')
        assert 'بدون موضوع' in str(inquiry)

    def test_ordering(self, sample_inquiries):
        """Test ordering by created_at descending."""
        inquiries = list(Inquiry.objects.all())
        assert inquiries[0].created_at >= inquiries[1].created_at


@pytest.mark.django_db
class TestInquiryCreateAPI:
    """Tests for Inquiry create API endpoint."""

    def test_create_inquiry(self, api_client):
        """Test creating an inquiry via public API."""
        data = {
            'name': 'علی محمدی',
            'phone': '09121234567',
            'subject': 'استعلام',
            'message': 'پیام تست'
        }
        response = api_client.post('/api/v1/inquiries/', data, format='json')
        assert response.status_code == 201
        assert Inquiry.objects.count() == 1

    def test_create_inquiry_minimal(self, api_client):
        """Test creating an inquiry with minimal data."""
        data = {
            'name': 'علی',
            'phone': '09121234567'
        }
        response = api_client.post('/api/v1/inquiries/', data, format='json')
        assert response.status_code == 201

    def test_create_inquiry_invalid(self, api_client):
        """Test creating an inquiry with invalid data."""
        data = {
            'name': '',  # Required
            'phone': '09121234567'
        }
        response = api_client.post('/api/v1/inquiries/', data, format='json')
        assert response.status_code == 400

    def test_inquiry_stores_ip(self, api_client):
        """Test that inquiry stores client IP."""
        data = {
            'name': 'علی',
            'phone': '09121234567'
        }
        api_client.post('/api/v1/inquiries/', data, format='json')
        inquiry = Inquiry.objects.first()
        assert inquiry.ip_address is not None


@pytest.mark.django_db
class TestInquiryAdminAPI:
    """Tests for Inquiry admin API endpoints."""

    def test_admin_list_requires_auth(self, api_client):
        """Test that admin list requires authentication."""
        response = api_client.get('/api/v1/admin/inquiries/')
        assert response.status_code == 401

    def test_admin_list_with_auth(self, admin_client, sample_inquiries):
        """Test admin list with authentication."""
        response = admin_client.get('/api/v1/admin/inquiries/')
        assert response.status_code == 200
        assert len(response.data['results']) == 5

    def test_admin_update_inquiry(self, admin_client, sample_inquiry):
        """Test updating inquiry status."""
        data = {'is_read': True, 'is_contacted': True}
        response = admin_client.patch(
            f'/api/v1/admin/inquiries/{sample_inquiry.pk}/',
            data,
            format='json'
        )
        assert response.status_code == 200
        assert response.data['is_read'] is True
        assert response.data['is_contacted'] is True
