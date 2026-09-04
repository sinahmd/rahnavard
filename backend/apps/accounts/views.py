from django.contrib.auth import login, logout, update_session_auth_hash
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, permissions
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .serializers import (
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer
)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@authentication_classes([])
@ensure_csrf_cookie
def login_view(request):
    """
    Authenticate user, establish a Django session and return the token.

    Dual-mode (Phase 2, pre-cutover): `django.contrib.auth.login()` creates the
    httpOnly session cookie the new admin client uses, while the DRF token is
    still returned for legacy clients until TokenAuthentication is removed.
    `@ensure_csrf_cookie` bootstraps the non-HttpOnly `csrftoken` cookie the
    browser echoes as `X-CSRFToken` on state-changing requests.
    `authentication_classes = []` keeps this endpoint anonymous even when the
    caller already holds an admin session — a session-authenticated unsafe POST
    would otherwise be rejected by DRF's CSRF enforcement.
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = serializer.validated_data['user']

    # Establish the server-side session (rotates any existing session key).
    login(request, user)

    # Legacy compatibility: keep returning/minting the DRF token until the
    # frontend has fully cut over (see plan §6.A step 4). Do NOT remove yet.
    token, _created = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': UserSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Log out through the authenticator that actually authenticated the request
    (read from `request.successful_authenticator` — never inferred from
    whether a token happens to exist).

    - SessionAuthentication (new cookie client): DRF enforces CSRF here; the
      Django session is destroyed but any legacy DRF token is PRESERVED so
      dual-mode rollback and legacy clients keep working.
    - TokenAuthentication (legacy client): the presented DRF token is deleted;
      token auth bypasses CSRF during dual mode because TokenAuthentication is
      deliberately listed first in settings.

    Both branches are idempotent.
    """
    authenticator = getattr(request, 'successful_authenticator', None)
    if isinstance(authenticator, SessionAuthentication):
        # Session logout: destroy the session only; the legacy DRF token is
        # PRESERVED so dual-mode rollback / legacy clients keep working.
        logout(request)
    elif isinstance(getattr(request, 'auth', None), Token):
        # Token logout: request.auth is the presented Token. This covers real
        # TokenAuthentication and DRF's force_authenticate() test shortcut
        # (ForcedAuthentication), whose authenticator is neither of the two
        # above but still carries the Token in request.auth. Deleting it
        # cannot raise (it exists).
        request.auth.delete()
    else:
        # Defensive: any other authenticator state keeps logout idempotent.
        logout(request)

    return Response({
        'message': 'Successfully logged out.'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@ensure_csrf_cookie
def session_view(request):
    """
    Admin bootstrap endpoint.

    Returns the current user when the request is authenticated through the
    default dual-mode classes — the session cookie (new client) or an
    `Authorization: Token` header (legacy client); 401 otherwise. It is a safe
    GET, so CSRF never applies here; `@ensure_csrf_cookie` guarantees the
    client has a `csrftoken` cookie before its first state-changing request.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user's information (legacy endpoint; the new
    client bootstraps through `/auth/session/` instead).
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    """
    Change current user's password.
    """
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    # Update session auth hash to keep user logged in
    update_session_auth_hash(request, request.user)

    # Invalidate old token and create new one
    request.user.auth_token.delete()
    new_token = Token.objects.create(user=request.user)

    return Response({
        'message': 'Password changed successfully.',
        'token': new_token.key
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def user_list_view(request):
    """
    List all users (admin only).
    """
    from django.contrib.auth.models import User
    users = User.objects.all().order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)
