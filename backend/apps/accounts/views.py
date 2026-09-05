from django.contrib.auth import login, logout, update_session_auth_hash
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, permissions
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

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
    Authenticate user and establish a Django session (cutover, plan §6.A.4).

    `django.contrib.auth.login()` creates the httpOnly session cookie the
    admin client authenticates with; no DRF token is minted or returned.
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

    return Response({
        'user': UserSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Destroy the admin session.

    SessionAuthentication enforces CSRF here (the client sends X-CSRFToken);
    the view is idempotent — logout() is safe on an already-empty session.
    """
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
    session cookie; 401 otherwise. It is a safe GET, so CSRF never applies
    here; `@ensure_csrf_cookie` guarantees the client has a `csrftoken`
    cookie before its first state-changing request.
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

    return Response({
        'message': 'Password changed successfully.',
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
