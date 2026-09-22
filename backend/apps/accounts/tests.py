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


@pytest.mark.django_db
class TestLoginThrottling:
    """Login brute-force protection (Phase 1 hardening): the scoped 'login'
    rate (5/minute per IP) must actually engage on /api/v1/auth/login/."""

    def test_throttle_scope_is_set_on_the_view_class(self):
        """Regression pin: ScopedRateThrottle reads the scope from the view
        INSTANCE at request time. Setting `throttle_scope` on the api_view
        wrapper function alone is invisible to it and the throttle silently
        never engages (verified against DRF's decorators.py/throttling.py).
        The scope must live on login_view.view_class."""
        from apps.accounts.views import login_view

        assert getattr(login_view.view_class, 'throttle_scope', None) == 'login'

    def test_login_throttled_after_5_attempts(self, api_client, settings):
        """Five login attempts (invalid credentials — they consume budget by
        design, that is the brute-force scenario) from one IP, the sixth
        gets 429."""
        from django.core.cache import cache
        from rest_framework.throttling import ScopedRateThrottle

        cache.clear()
        fw = dict(settings.REST_FRAMEWORK)
        fw['DEFAULT_THROTTLE_RATES'] = {
            **fw['DEFAULT_THROTTLE_RATES'],
            'login': '5/minute',
        }
        # The test client has no proxy chain: key directly on REMOTE_ADDR.
        fw['NUM_PROXIES'] = 0
        settings.REST_FRAMEWORK = fw

        # DRF snapshots DEFAULT_THROTTLE_RATES onto ScopedRateThrottle when
        # the module first imports, so a settings override alone is invisible
        # once any earlier test made a request — rebind the snapshot too, and
        # restore it afterwards (same pattern as inquiries throttling tests).
        original_rates = ScopedRateThrottle.THROTTLE_RATES
        ScopedRateThrottle.THROTTLE_RATES = {**original_rates, 'login': '5/minute'}
        try:
            data = {'username': 'nobody', 'password': 'wrong'}
            # Distinct client IP: keeps this bucket isolated from other tests.
            extra = {'REMOTE_ADDR': '10.9.0.1'}
            for _ in range(5):
                response = api_client.post('/api/v1/auth/login/', data, format='json', **extra)
                assert response.status_code == 400
            response = api_client.post('/api/v1/auth/login/', data, format='json', **extra)
            assert response.status_code == 429
        finally:
            ScopedRateThrottle.THROTTLE_RATES = original_rates
            cache.clear()

    def test_production_cache_is_shared_between_workers(self):
        """Phase 1: the login throttle keeps its counters in the default cache,
        and that cache must not be per-process.

        Django's implicit default (LocMemCache) is per-process, and production
        runs `gunicorn --workers 2` — two processes holding two independent
        counters, so a configured 5/minute was delivered at roughly double.
        Pins the shared backend so it cannot be silently reverted.
        """
        from importlib import import_module
        from pathlib import Path

        # `config.test_settings` rebinds only its own namespace, so the real
        # production module still holds the configured value.
        prod = import_module('config.settings')
        assert (
            prod.CACHES['default']['BACKEND']
            == 'django.core.cache.backends.filebased.FileBasedCache'
        )
        # Cache files must not land under MEDIA_ROOT: nginx serves that tree
        # read-only and publicly, so throttle keys (client IPs) would leak.
        location = Path(prod.CACHES['default']['LOCATION'])
        assert not location.is_relative_to(Path(prod.MEDIA_ROOT))

    def test_login_budget_is_shared_across_worker_processes(self, tmp_path):
        """Five attempts split across two worker-like cache instances: the
        sixth is still denied.

        Two FileBasedCache objects over one directory are exactly what two
        gunicorn workers are — separate in-memory state over shared on-disk
        state. With per-process counters each worker would grant its own five
        and the effective limit would double.
        """
        from django.contrib.auth.models import AnonymousUser
        from django.core.cache.backends.filebased import FileBasedCache
        from rest_framework.test import APIRequestFactory
        from rest_framework.throttling import ScopedRateThrottle

        class _LoginView:
            throttle_scope = 'login'

        # Two "workers" reading and writing the same cache directory.
        workers = [FileBasedCache(str(tmp_path), {}), FileBasedCache(str(tmp_path), {})]

        # ScopedRateThrottle.get_cache_key() reads request.user: an anonymous
        # attempt (the brute-force case) keys the bucket on the client IP.
        request = APIRequestFactory().post('/api/v1/auth/login/')
        request.user = AnonymousUser()

        original_rates = ScopedRateThrottle.THROTTLE_RATES
        ScopedRateThrottle.THROTTLE_RATES = {**original_rates, 'login': '5/minute'}
        try:
            allowed = []
            for attempt in range(6):
                throttle = ScopedRateThrottle()
                throttle.cache = workers[attempt % len(workers)]
                allowed.append(throttle.allow_request(request, _LoginView()))
            assert allowed == [True, True, True, True, True, False]
        finally:
            ScopedRateThrottle.THROTTLE_RATES = original_rates
