"""
Session-cookie + CSRF tests for the Phase 2 auth cutover (session-only).

Covers the matrix from docs/SENIOR_REFACTOR_PLAN.md §6.A:
- login bootstraps a Django session + `csrftoken` cookie and returns ONLY the
  user (no DRF token is minted or returned — TokenAuthentication is removed);
- GET /auth/session/ restores a valid session and rejects anonymous requests
  with 403 (session-only auth has no WWW-Authenticate challenge → no 401);
- session-authenticated unsafe writes require X-CSRFToken (403 without it);
- logout destroys the session;
- the public inquiry POST stays anonymous — 201 for a logged-in admin with no
  CSRF header (authentication_classes = [] exemption);
- non-staff users stay forbidden on admin endpoints.

Root conftest fixtures used: `admin_user` (superuser admin/adminpass123) and
`user` (regular testuser/testpass123).
"""

import json

import pytest
from django.test import Client as DjangoClient
from rest_framework.test import APIClient

from apps.inquiries.models import Inquiry

LOGIN_URL = '/api/v1/auth/login/'
LOGOUT_URL = '/api/v1/auth/logout/'
SESSION_URL = '/api/v1/auth/session/'
INQUIRIES_URL = '/api/v1/inquiries/'

# Django's test client disables CSRF enforcement by default
# (enforce_csrf_checks=False sets request._dont_enforce_csrf_checks, which DRF's
# internal CSRFCheck also honours), so every test that must *exercise* CSRF uses
# a plain Django client created with enforce_csrf_checks=True. DRF's APIClient
# cannot express this (it hard-codes the Django client default).


def do_login(client, username='admin', password='adminpass123'):
    """POST credentials and return the response (sets session+csrf cookies)."""
    return client.post(
        LOGIN_URL,
        {'username': username, 'password': password},
        format='json',
    )


def inquiry_payload():
    return {
        'name': 'علی',
        'phone': '09120000000',
        'subject': 'خرید',
        'message': 'سلام، لطفاً تماس بگیرید.',
    }


def create_inquiry(client):
    """
    Create an inquiry through the public endpoint and return its row id.
    (InquiryCreateSerializer intentionally does not expose `id` in its
    response, so the id is read back from the database.)
    """
    resp = client.post(INQUIRIES_URL, inquiry_payload(), format='json')
    assert resp.status_code == 201
    return resp, Inquiry.objects.order_by('-id').first().id


def csrf_login_client(admin_user):
    """
    Django client with CSRF enforcement ON and a live admin session.

    The login response sets the sessionid cookie (authenticates subsequent
    requests) and the csrftoken cookie (echoed as X-CSRFToken by the browser).
    """
    client = DjangoClient(enforce_csrf_checks=True)
    resp = client.post(
        LOGIN_URL,
        data=json.dumps({'username': 'admin', 'password': 'adminpass123'}),
        content_type='application/json',
    )
    assert resp.status_code == 200
    return client, client.cookies['csrftoken'].value


def csrf_create_inquiry(client):
    """Public inquiry creation through a plain Django client (JSON)."""
    resp = client.post(
        INQUIRIES_URL,
        data=json.dumps(inquiry_payload()),
        content_type='application/json',
    )
    assert resp.status_code == 201
    return Inquiry.objects.order_by('-id').first().id


@pytest.mark.django_db
class TestLoginSessionBootstrap:
    """Login must establish the session and CSRF cookie — token-free."""

    def test_login_creates_session_and_csrf_cookie(self, api_client, admin_user):
        resp = do_login(api_client)
        assert resp.status_code == 200
        # Session-only contract (plan §6.A.4): no token field, ever.
        assert set(resp.data.keys()) == {'user'}
        assert 'sessionid' in resp.cookies
        assert 'csrftoken' in resp.cookies

        # The session cookie is actually usable: the next request is
        # authenticated without any Authorization header.
        session = api_client.get(SESSION_URL)
        assert session.status_code == 200
        assert session.data['username'] == 'admin'

    def test_cookie_flags_session_httponly_csrf_readable(self, api_client, admin_user):
        """Phase 6 hardening: `sessionid` is HttpOnly; `csrftoken` must stay
        readable by JS (the client echoes it as X-CSRFToken)."""
        resp = do_login(api_client)
        assert resp.status_code == 200
        session = resp.cookies['sessionid']
        csrf = resp.cookies['csrftoken']
        # Morsel exposes httpOnly as True when set, '' when not
        assert session['httponly']  # JS must never read sessionid
        assert not csrf['httponly']  # readable on purpose: echoed as X-CSRFToken
        assert session['samesite'] == 'Lax'
        assert csrf['samesite'] == 'Lax'

    def test_login_allowed_again_for_session_holder_without_csrf(self, api_client, admin_user):
        """Login stays anonymous so a session-holder can re-login (no CSRF 403)."""
        assert do_login(api_client).status_code == 200
        again = do_login(api_client)
        assert again.status_code == 200

    def test_legacy_token_header_is_ignored(self, api_client, admin_user):
        """After the cutover a stale `Authorization: Token` header no longer
        authenticates anything — the request is anonymous (403 on session)."""
        legacy = APIClient()
        legacy.credentials(HTTP_AUTHORIZATION='Token not-a-real-token')
        assert legacy.get(SESSION_URL).status_code == 403


@pytest.mark.django_db
class TestSessionRestore:
    """GET /auth/session/ is the admin bootstrap endpoint."""

    def test_session_restores_authenticated_user(self, api_client, admin_user):
        do_login(api_client)
        resp = api_client.get(SESSION_URL)
        assert resp.status_code == 200
        assert resp.data['username'] == 'admin'
        assert resp.data['is_staff'] is True

    def test_session_rejects_anonymous_request(self, api_client):
        """403, not 401: session-only auth has no WWW-Authenticate challenge."""
        resp = api_client.get(SESSION_URL)
        assert resp.status_code == 403


@pytest.mark.django_db
class TestCsrfEnforcement:
    """Session-authenticated unsafe writes need X-CSRFToken."""

    def test_session_write_without_csrf_is_403(self, admin_user):
        client, _ = csrf_login_client(admin_user)
        inquiry_id = csrf_create_inquiry(client)
        url = f'/api/v1/admin/inquiries/{inquiry_id}/'
        # Session cookie + NO X-CSRFToken → DRF SessionAuthentication rejects.
        resp = client.patch(
            url,
            data=json.dumps({'is_read': True}),
            content_type='application/json',
        )
        assert resp.status_code == 403

    def test_session_write_with_csrf_header_succeeds(self, admin_user):
        client, csrf = csrf_login_client(admin_user)
        inquiry_id = csrf_create_inquiry(client)
        url = f'/api/v1/admin/inquiries/{inquiry_id}/'
        resp = client.patch(
            url,
            data=json.dumps({'is_read': True}),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        assert resp.status_code == 200
        assert json.loads(resp.content)['is_read'] is True

    def test_logout_requires_csrf_for_session_client(self, admin_user):
        client, _ = csrf_login_client(admin_user)
        resp = client.post(LOGOUT_URL)
        assert resp.status_code == 403


@pytest.mark.django_db
class TestPublicInquiryExemption:
    """Public POST views declare authentication_classes=[] (plan §6.A A3)."""

    def test_public_inquiry_ok_for_logged_in_admin_without_csrf(self, admin_user):
        client, _ = csrf_login_client(admin_user)  # admin session cookie held
        # CSRF enforcement is ON for this client; the exemption is what lets
        # the anonymous public form through without an X-CSRFToken header.
        resp = client.post(
            INQUIRIES_URL,
            data=json.dumps(inquiry_payload()),
            content_type='application/json',
        )
        assert resp.status_code == 201

    def test_public_inquiry_ok_anonymously(self, api_client):
        resp = api_client.post(INQUIRIES_URL, inquiry_payload(), format='json')
        assert resp.status_code == 201


@pytest.mark.django_db
class TestLogout:
    """Logout destroys the session (CSRF enforced for session clients)."""

    def test_logout_destroys_session(self, admin_user):
        client, csrf = csrf_login_client(admin_user)
        out = client.post(LOGOUT_URL, HTTP_X_CSRFTOKEN=csrf)
        assert out.status_code == 200
        # Session gone → bootstrap endpoint now rejects (403, session-only).
        assert client.get(SESSION_URL).status_code == 403

    def test_logout_is_idempotent_without_session(self, api_client):
        """A session-less POST to logout is still an authenticated-required
        endpoint; with no credentials it must 403, not crash."""
        assert api_client.post(LOGOUT_URL).status_code == 403


@pytest.mark.django_db
class TestAuthorizationStillEnforced:
    """IsAdminUser still governs admin endpoints (session-only)."""

    def test_non_staff_session_user_is_forbidden(self, api_client, user):
        do_login(api_client, username='testuser', password='testpass123')
        assert api_client.get('/api/v1/admin/branches/').status_code == 403
