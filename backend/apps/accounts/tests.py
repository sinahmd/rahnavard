import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APIRequestFactory

from .permissions import (
    IsAdminOrReadOnly,
    IsOwnerOrReadOnly,
    IsStaffUser,
    IsSuperUser,
    IsSuperUserOrReadOnly,
)


@pytest.fixture
def superuser(db):
    """Create a superuser."""
    return User.objects.create_superuser(
        username='superadmin',
        email='super@test.com',
        password='superpass123'
    )


@pytest.fixture
def staff_user(db):
    """Create a staff user (not superuser)."""
    return User.objects.create_user(
        username='staffuser',
        email='staff@test.com',
        password='staffpass123',
        is_staff=True,
        is_superuser=False
    )


@pytest.fixture
def regular_user(db):
    """Create a regular user (not staff, not superuser)."""
    return User.objects.create_user(
        username='regularuser',
        email='regular@test.com',
        password='regularpass123'
    )


@pytest.fixture
def factory():
    """Return an API request factory."""
    return APIRequestFactory()


@pytest.mark.django_db
class TestLoginAPI:
    """Tests for login API endpoint."""

    def test_login_success(self, api_client, user):
        """Successful login returns the user and NO token (session-only)."""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post('/api/v1/auth/login/', data, format='json')
        assert response.status_code == 200
        # Session-only contract (plan §6.A.4): the session cookie is the
        # credential — no DRF token is minted or returned.
        assert set(response.data.keys()) == {'user'}
        assert response.data['user']['username'] == 'testuser'

    def test_login_invalid_credentials(self, api_client, user):
        """Test login with invalid credentials."""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = api_client.post('/api/v1/auth/login/', data, format='json')
        assert response.status_code == 400

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user."""
        data = {
            'username': 'nonexistent',
            'password': 'password'
        }
        response = api_client.post('/api/v1/auth/login/', data, format='json')
        assert response.status_code == 400

    def test_user_creation_works_without_token_signal(self, db):
        """The removed post_save token signal must not break user creation."""
        user = User.objects.create_user(
            username='signalfree',
            email='signal@example.com',
            password='signalpass123',
        )
        user.refresh_from_db()
        assert user.username == 'signalfree'


@pytest.mark.django_db
class TestLogoutAPI:
    """Tests for logout API endpoint."""

    def test_logout_success(self, api_client, user):
        """Test successful logout (session-authenticated)."""
        api_client.force_authenticate(user=user)
        response = api_client.post('/api/v1/auth/logout/')
        assert response.status_code == 200

    def test_logout_requires_auth(self, api_client):
        """Logout requires authentication (403: session-only auth has no
        WWW-Authenticate challenge, so no 401)."""
        response = api_client.post('/api/v1/auth/logout/')
        assert response.status_code == 403


@pytest.mark.django_db
class TestCurrentUserAPI:
    """Tests for current user API endpoint."""

    def test_get_current_user(self, api_client, user):
        """Test getting current user info."""
        api_client.force_authenticate(user=user)
        response = api_client.get('/api/v1/auth/user/')
        assert response.status_code == 200
        assert response.data['username'] == 'testuser'
        assert response.data['email'] == 'test@example.com'

    def test_get_current_user_requires_auth(self, api_client):
        """Getting current user requires authentication (403: session-only
        auth has no WWW-Authenticate challenge, so no 401)."""
        response = api_client.get('/api/v1/auth/user/')
        assert response.status_code == 403


@pytest.mark.django_db
class TestChangePasswordAPI:
    """Tests for change password API endpoint."""

    def test_change_password_success(self, api_client, user):
        """Successful change: no token returned, session stays valid."""
        api_client.force_authenticate(user=user)
        data = {
            'old_password': 'testpass123',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        }
        response = api_client.post('/api/v1/auth/change-password/', data, format='json')
        assert response.status_code == 200
        assert 'token' not in response.data  # session-only: no token minted
        user.refresh_from_db()
        assert user.check_password('newpass123')

    def test_change_password_wrong_old(self, api_client, user):
        """Test password change with wrong old password."""
        api_client.force_authenticate(user=user)
        data = {
            'old_password': 'wrongpassword',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        }
        response = api_client.post('/api/v1/auth/change-password/', data, format='json')
        assert response.status_code == 400

    def test_change_password_mismatch(self, api_client, user):
        """Test password change with mismatched passwords."""
        api_client.force_authenticate(user=user)
        data = {
            'old_password': 'testpass123',
            'new_password': 'newpass123',
            'new_password_confirm': 'differentpass'
        }
        response = api_client.post('/api/v1/auth/change-password/', data, format='json')
        assert response.status_code == 400


@pytest.mark.django_db
class TestUserListAPI:
    """Tests for user list API endpoint."""

    def test_user_list_requires_admin(self, api_client, user):
        """Test that user list requires admin privileges."""
        api_client.force_authenticate(user=user)
        response = api_client.get('/api/v1/auth/users/')
        assert response.status_code == 403

    def test_user_list_with_admin(self, api_client, admin_user):
        """Test user list with admin privileges."""
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/v1/auth/users/')
        assert response.status_code == 200
        assert len(response.data) >= 1


@pytest.mark.django_db
class TestIsSuperUserPermission:
    """Tests for IsSuperUser permission."""

    def test_allows_superuser(self, factory, superuser):
        """Superuser should be granted access."""
        request = factory.get('/')
        request.user = superuser
        perm = IsSuperUser()
        assert perm.has_permission(request, None) is True

    def test_allows_staff_user(self, factory, staff_user):
        """Staff user (non-superuser) should be denied."""
        request = factory.get('/')
        request.user = staff_user
        perm = IsSuperUser()
        assert perm.has_permission(request, None) is False

    def test_allows_regular_user(self, factory, regular_user):
        """Regular user should be denied."""
        request = factory.get('/')
        request.user = regular_user
        perm = IsSuperUser()
        assert perm.has_permission(request, None) is False

    def test_denies_anonymous_user(self, factory):
        """Anonymous user should be denied."""
        request = factory.get('/')
        request.user = None
        perm = IsSuperUser()
        assert perm.has_permission(request, None) is False


@pytest.mark.django_db
class TestIsStaffUserPermission:
    """Tests for IsStaffUser permission."""

    def test_allows_staff_user(self, factory, staff_user):
        """Staff user should be granted access."""
        request = factory.get('/')
        request.user = staff_user
        perm = IsStaffUser()
        assert perm.has_permission(request, None) is True

    def test_allows_superuser(self, factory, superuser):
        """Superuser (is_staff=True) should also be granted."""
        request = factory.get('/')
        request.user = superuser
        perm = IsStaffUser()
        assert perm.has_permission(request, None) is True

    def test_denies_regular_user(self, factory, regular_user):
        """Regular user should be denied."""
        request = factory.get('/')
        request.user = regular_user
        perm = IsStaffUser()
        assert perm.has_permission(request, None) is False

    def test_denies_anonymous_user(self, factory):
        """Anonymous user should be denied."""
        request = factory.get('/')
        request.user = None
        perm = IsStaffUser()
        assert perm.has_permission(request, None) is False


@pytest.mark.django_db
class TestIsOwnerOrReadOnlyPermission:
    """Tests for IsOwnerOrReadOnly permission."""

    def test_allows_read_for_anyone(self, factory, regular_user):
        """GET requests should be allowed for any user."""
        request = factory.get('/')
        request.user = regular_user
        perm = IsOwnerOrReadOnly()

        # Create a mock object with an owner attribute
        class MockObj:
            owner = None

        assert perm.has_object_permission(request, None, MockObj()) is True

    def test_allows_read_for_anonymous(self, factory):
        """GET requests should be allowed for anonymous users."""
        request = factory.get('/')
        request.user = None
        perm = IsOwnerOrReadOnly()

        class MockObj:
            owner = None

        assert perm.has_object_permission(request, None, MockObj()) is True

    def test_allows_write_for_owner(self, factory, regular_user):
        """PUT/PATCH should be allowed for the object owner."""
        request = factory.put('/')
        request.user = regular_user
        perm = IsOwnerOrReadOnly()

        class MockObj:
            owner = regular_user

        assert perm.has_object_permission(request, None, MockObj()) is True

    def test_denies_write_for_non_owner(self, factory, regular_user, staff_user):
        """PUT/PATCH should be denied for non-owners."""
        request = factory.put('/')
        request.user = regular_user
        perm = IsOwnerOrReadOnly()

        class MockObj:
            owner = staff_user

        assert perm.has_object_permission(request, None, MockObj()) is False

    def test_denies_delete_for_non_owner(self, factory, regular_user, staff_user):
        """DELETE should be denied for non-owners."""
        request = factory.delete('/')
        request.user = regular_user
        perm = IsOwnerOrReadOnly()

        class MockObj:
            owner = staff_user

        assert perm.has_object_permission(request, None, MockObj()) is False

    def test_head_request_always_allowed(self, factory, regular_user):
        """HEAD (safe method) should always be allowed."""
        request = factory.head('/')
        request.user = regular_user
        perm = IsOwnerOrReadOnly()

        class MockObj:
            owner = None

        assert perm.has_object_permission(request, None, MockObj()) is True


@pytest.mark.django_db
class TestIsAdminOrReadOnlyPermission:
    """Tests for IsAdminOrReadOnly permission."""

    def test_allows_read_for_anonymous(self, factory):
        """GET requests should be allowed for anonymous users."""
        request = factory.get('/')
        request.user = None
        perm = IsAdminOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_allows_read_for_regular_user(self, factory, regular_user):
        """GET requests should be allowed for regular users."""
        request = factory.get('/')
        request.user = regular_user
        perm = IsAdminOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_allows_write_for_staff(self, factory, staff_user):
        """POST/PUT should be allowed for staff users."""
        request = factory.post('/')
        request.user = staff_user
        perm = IsAdminOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_allows_write_for_superuser(self, factory, superuser):
        """POST/PUT should be allowed for superusers."""
        request = factory.post('/')
        request.user = superuser
        perm = IsAdminOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_denies_write_for_regular_user(self, factory, regular_user):
        """POST/PUT should be denied for regular users."""
        request = factory.post('/')
        request.user = regular_user
        perm = IsAdminOrReadOnly()
        assert perm.has_permission(request, None) is False

    def test_denies_write_for_anonymous(self, factory):
        """POST/PUT should be denied for anonymous users."""
        request = factory.post('/')
        request.user = None
        perm = IsAdminOrReadOnly()
        assert perm.has_permission(request, None) is False


@pytest.mark.django_db
class TestIsSuperUserOrReadOnlyPermission:
    """Tests for IsSuperUserOrReadOnly permission."""

    def test_allows_read_for_anonymous(self, factory):
        """GET requests should be allowed for anonymous users."""
        request = factory.get('/')
        request.user = None
        perm = IsSuperUserOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_allows_read_for_regular_user(self, factory, regular_user):
        """GET requests should be allowed for regular users."""
        request = factory.get('/')
        request.user = regular_user
        perm = IsSuperUserOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_allows_read_for_staff(self, factory, staff_user):
        """GET requests should be allowed for staff users."""
        request = factory.get('/')
        request.user = staff_user
        perm = IsSuperUserOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_allows_write_for_superuser(self, factory, superuser):
        """POST/PUT should be allowed for superusers."""
        request = factory.post('/')
        request.user = superuser
        perm = IsSuperUserOrReadOnly()
        assert perm.has_permission(request, None) is True

    def test_denies_write_for_staff(self, factory, staff_user):
        """POST/PUT should be denied for staff (non-superuser)."""
        request = factory.post('/')
        request.user = staff_user
        perm = IsSuperUserOrReadOnly()
        assert perm.has_permission(request, None) is False

    def test_denies_write_for_regular_user(self, factory, regular_user):
        """POST/PUT should be denied for regular users."""
        request = factory.post('/')
        request.user = regular_user
        perm = IsSuperUserOrReadOnly()
        assert perm.has_permission(request, None) is False

    def test_denies_write_for_anonymous(self, factory):
        """POST/PUT should be denied for anonymous users."""
        request = factory.post('/')
        request.user = None
        perm = IsSuperUserOrReadOnly()
        assert perm.has_permission(request, None) is False
