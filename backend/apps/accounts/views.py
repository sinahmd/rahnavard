from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import update_session_auth_hash

from .serializers import (
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer
)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """
    Authenticate user and return token.
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = serializer.validated_data['user']

    # Get or create token
    token, created = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Delete user's auth token to logout.
    """
    try:
        request.user.auth_token.delete()
    except Exception:
        pass

    return Response({
        'message': 'Successfully logged out.'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user's information.
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
