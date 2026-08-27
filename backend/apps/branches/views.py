from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Branch
from .serializers import BranchAdminSerializer, BranchSerializer


class BranchListView(generics.ListAPIView):
    """Public endpoint for listing active branches."""

    serializer_class = BranchSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Branch.objects.filter(is_active=True)


class BranchAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating branches."""

    serializer_class = BranchAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Branch.objects.with_deleted()


class BranchAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for branch detail, update, and delete."""

    serializer_class = BranchAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Branch.objects.with_deleted()

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.soft_delete()


class BranchRestoreView(generics.GenericAPIView):
    """Admin endpoint to restore a soft-deleted branch."""

    serializer_class = BranchAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Branch.objects.with_deleted()

    def post(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_deleted:
            return Response(
                {'detail': 'This branch is not soft-deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.restore()
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
