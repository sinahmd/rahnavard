from rest_framework import permissions


class IsSuperUser(permissions.BasePermission):
    """
    Allows access only to superusers (developers).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsStaffUser(permissions.BasePermission):
    """
    Allows access only to staff users (content managers).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Instance must have an attribute named `owner`.
        return obj.owner == request.user


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allows read access to anyone, but write access only to admin users.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class IsSuperUserOrReadOnly(permissions.BasePermission):
    """
    Allows read access to anyone, but write access only to superusers.
    Useful for critical operations like deleting cars with inquiries.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_superuser)
